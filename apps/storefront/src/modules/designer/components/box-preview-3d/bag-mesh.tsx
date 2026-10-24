"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { ThreeEvent } from "@react-three/fiber"
import { Line } from "@react-three/drei"
import { COURIER_BAG_PANEL_NAMES } from "@dtc/packaging-engine/pouch-styles"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import { usePanelTextures } from "./use-panel-textures"

// Unprinted poly mailer film - only a customer-chosen background color
// (Marka Kiti / Tema) overrides it.
export const DEFAULT_FILM_COLOR = "#f2f2ef"

// How far each face bulges out at its fullest, as a share of the bag's
// width - a bag with a product inside, not a flat sheet.
const BULGE_RATIO = 0.13
// Width of the flat heat-welded seams (left side, bottom, and the mouth the
// flap seals) - the film is pressed flat there, so the bulge starts inside.
const SEAL_MM = 10
// Front and back film never quite touch, even at a seam - without this
// they'd sit in the same plane there and z-fight.
const SEAM_HALF_GAP_M = 0.0006
// The flap rides this far above the front surface it's stuck to.
const FLAP_LIFT_M = 0.0012
const SEGMENTS_PER_M = 400

// Same arm-then-confirm click as BoxMesh: the first click on a face only
// highlights it, a second click on the same face jumps to 2D - so an orbit
// drag that starts and ends over one face doesn't count as a jump.
const ARM_TIMEOUT_MS = 4000

const PRINTED_PANELS = Object.values(COURIER_BAG_PANEL_NAMES)

export type BagDimensionsM = { width: number; height: number; flapHeight: number }

type BagMeshProps = {
  panels: PanelGeometry[]
  resolvedLayout?: ResolvedLayout | null
  backgroundColors?: Record<string, string>
  dimensionsM: BagDimensionsM
  onFaceClick?: (panelName: string) => void
}

type Rect = { minX: number; minY: number; maxX: number; maxY: number }

const boundsOf = (points: { x: number; y: number }[]): Rect => ({
  minX: Math.min(...points.map((p) => p.x)),
  minY: Math.min(...points.map((p) => p.y)),
  maxX: Math.max(...points.map((p) => p.x)),
  maxY: Math.max(...points.map((p) => p.y)),
})

// 0 inside a flat seam band, rising to 1 in the middle - sin^0.6 gives a
// full, rounded belly rather than a sharp peak.
const profile = (t: number, startBand: number, endBand: number) => {
  if (t <= startBand || t >= 1 - endBand) return 0
  const u = (t - startBand) / (1 - startBand - endBand)
  return Math.pow(Math.sin(Math.PI * u), 0.6)
}

// Surface height above the bag's middle plane at (x, y), in the bag's own
// coordinates (meters, centered, front facing +z). Seams on the left, the
// bottom and the top; the right-hand side is the fold, which rounds over
// with no seam.
const bulgeAt = (x: number, y: number, d: BagDimensionsM) => {
  const sealX = SEAL_MM / 1000 / d.width
  const sealY = SEAL_MM / 1000 / d.height
  const u = x / d.width + 0.5
  const v = y / d.height + 0.5
  return SEAM_HALF_GAP_M + d.width * BULGE_RATIO * profile(u, sealX, 0) * profile(v, sealY, sealY)
}

// The flap's free edge, traced over the front surface - a faint line so the
// flap reads as a separate layer even when it's the same color as the bag.
const SEGMENTS_ON_EDGE = 48
const flapEdgePoints = (d: BagDimensionsM): [number, number, number][] => {
  const y = d.height / 2 - d.flapHeight
  return Array.from({ length: SEGMENTS_ON_EDGE + 1 }, (_, i) => {
    // Stops just short of the bag's sides so it never pokes past them.
    const inset = SEAM_HALF_GAP_M * 2
    const x = -d.width / 2 + inset + ((d.width - inset * 2) * i) / SEGMENTS_ON_EDGE
    return [x, y, bulgeAt(x, y, d) + FLAP_LIFT_M * 1.5]
  })
}

// A face surface: a subdivided plane, optionally turned to face -z (the
// back) or with its UVs turned 180° (the folded flap), then pushed out
// along z by the bulge.
const buildSurface = (
  d: BagDimensionsM,
  height: number,
  centerY: number,
  side: "front" | "back",
  options: { flipUv?: boolean; lift?: number } = {}
) => {
  const geometry = new THREE.PlaneGeometry(
    d.width,
    height,
    Math.max(8, Math.round(d.width * SEGMENTS_PER_M)),
    Math.max(4, Math.round(height * SEGMENTS_PER_M))
  )
  if (side === "back") geometry.rotateY(Math.PI)
  geometry.translate(0, centerY, 0)

  if (options.flipUv) {
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i))
  }

  const position = geometry.attributes.position
  const sign = side === "front" ? 1 : -1
  for (let i = 0; i < position.count; i++) {
    const z = bulgeAt(position.getX(i), position.getY(i), d) + (options.lift ?? 0)
    position.setZ(i, sign * z)
  }
  geometry.computeVertexNormals()
  return geometry
}

// The print zone textures only cover each zone - pastes one onto a canvas
// the size of its whole panel, over the panel's background, so it can wrap
// a full face.
const composeFaceTexture = (
  panel: PanelGeometry,
  zoneTexture: THREE.CanvasTexture | undefined,
  backgroundColor: string
) => {
  const outline = boundsOf([...panel.cutLines, ...panel.creaseLines].flat())
  const zone = panel.printZones[0] ? boundsOf(panel.printZones[0].boundary) : null
  const zoneCanvas = zoneTexture?.image as HTMLCanvasElement | undefined
  const pxPerMm = zone && zoneCanvas ? zoneCanvas.width / (zone.maxX - zone.minX) : 4

  const canvas = document.createElement("canvas")
  canvas.width = Math.round((outline.maxX - outline.minX) * pxPerMm)
  canvas.height = Math.round((outline.maxY - outline.minY) * pxPerMm)
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (zone && zoneCanvas) {
    ctx.drawImage(
      zoneCanvas,
      (zone.minX - outline.minX) * pxPerMm,
      (outline.maxY - zone.maxY) * pxPerMm,
      (zone.maxX - zone.minX) * pxPerMm,
      (zone.maxY - zone.minY) * pxPerMm
    )
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// The bag sealed and standing upright, front toward the camera, filled out
// as if something were inside. The back is the same film seen from behind,
// and the flap folds over the top of the front - which turns its print
// 180°, exactly as it reads on a real sealed bag.
const BagMesh = ({ panels, resolvedLayout, backgroundColors, dimensionsM, onFaceClick }: BagMeshProps) => {
  const zoneTextures = usePanelTextures(
    panels,
    PRINTED_PANELS,
    resolvedLayout,
    backgroundColors,
    DEFAULT_FILM_COLOR
  )

  const { width, height, flapHeight } = dimensionsM
  const surfaces = useMemo(() => {
    const d = { width, height, flapHeight }
    return {
      [COURIER_BAG_PANEL_NAMES.front]: buildSurface(d, height, 0, "front"),
      [COURIER_BAG_PANEL_NAMES.back]: buildSurface(d, height, 0, "back"),
      [COURIER_BAG_PANEL_NAMES.flap]: buildSurface(d, flapHeight, height / 2 - flapHeight / 2, "front", {
        flipUv: true,
        lift: FLAP_LIFT_M,
      }),
    }
  }, [width, height, flapHeight])
  useEffect(() => () => Object.values(surfaces).forEach((g) => g.dispose()), [surfaces])

  const faceTextures = useMemo(() => {
    const next: Record<string, THREE.CanvasTexture> = {}
    for (const panel of panels) {
      if (!PRINTED_PANELS.includes(panel.panelName as (typeof PRINTED_PANELS)[number])) continue
      next[panel.panelName] = composeFaceTexture(
        panel,
        zoneTextures?.[panel.panelName],
        backgroundColors?.[panel.panelName] ?? DEFAULT_FILM_COLOR
      )
    }
    return next
  }, [panels, zoneTextures, backgroundColors])
  useEffect(() => () => Object.values(faceTextures).forEach((t) => t.dispose()), [faceTextures])

  const [armedPanel, setArmedPanel] = useState<string | null>(null)
  const armTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current)
    }
  }, [])

  const clickHandlerFor = (panelName: string) =>
    onFaceClick &&
    ((event: ThreeEvent<MouseEvent>) => {
      // Only the nearest face hit counts - the flap sits on top of the front.
      event.stopPropagation()
      if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current)
      if (armedPanel === panelName) {
        setArmedPanel(null)
        onFaceClick(panelName)
        return
      }
      setArmedPanel(panelName)
      armTimeoutRef.current = setTimeout(() => setArmedPanel(null), ARM_TIMEOUT_MS)
    })

  return (
    <>
      {PRINTED_PANELS.map((panelName) => (
        <mesh key={panelName} geometry={surfaces[panelName]} onClick={clickHandlerFor(panelName)}>
          {/* Poly film: a soft sheen rather than matte board. */}
          <meshPhysicalMaterial
            map={faceTextures[panelName] ?? null}
            color={faceTextures[panelName] ? "#ffffff" : DEFAULT_FILM_COLOR}
            roughness={0.42}
            metalness={0}
            clearcoat={0.35}
            clearcoatRoughness={0.4}
            emissive={armedPanel === panelName ? "#ffffff" : "#000000"}
            emissiveIntensity={armedPanel === panelName ? 0.12 : 0}
          />
        </mesh>
      ))}
      <Line
        points={flapEdgePoints(dimensionsM)}
        color="#000000"
        lineWidth={1.2}
        transparent
        opacity={0.22}
      />
    </>
  )
}

export default BagMesh
