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
// width - thin film over a product, not a pillow.
const BULGE_RATIO = 0.075
// The contents draw the film in: each edge pulls toward the middle by this
// share of the bulge depth where the bag is fullest, so the sides curve in
// and the corners stay put - the classic filled-mailer outline.
const EDGE_DRAW_IN = 0.75
// Soft creases the film forms where it's pulled tight around the contents:
// they fan out from each corner toward the middle, fading with distance,
// and never reach the flat seams.
const CREASE_DEPTH_M = 0.0011
const CREASES_PER_CORNER = 9
// How far a corner's creases reach, as a share of the bag's shorter side.
const CREASE_REACH = 0.45
// A gentle bow along the bag's height, as when it's held or propped up.
const BEND_RATIO = 0.025
// Width of the flat heat-welded seams (left side, bottom, and the mouth the
// flap seals) - the film is pressed flat there, so the bulge starts inside.
const SEAL_MM = 10
// Heat-sealing presses a fine ribbed texture into the seams.
const SEAL_RIB_PITCH_M = 0.004
const SEAL_RIB_DEPTH_M = 0.00018
// Front and back film never quite touch, even at a seam - without this
// they'd sit in the same plane there and z-fight.
const SEAM_HALF_GAP_M = 0.0004
// The flap rides this far above the front surface it's stuck to.
const FLAP_LIFT_M = 0.0008
const SEGMENTS_PER_M = 600

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

// 0 inside a flat seam band, rising to 1 in the middle - a low exponent
// keeps the middle broad and flat, the way film stretches over a product.
const profile = (t: number, startBand: number, endBand: number) => {
  if (t <= startBand || t >= 1 - endBand) return 0
  const u = (t - startBand) / (1 - startBand - endBand)
  return Math.pow(Math.sin(Math.PI * u), 0.45)
}

type Face = "front" | "back"

// Per-face, per-corner phase offsets - fixed, so the creases don't jump
// around between renders, and different on each face so the back isn't a
// mirror of the front.
const CREASE_PHASES: Record<Face, number[]> = {
  front: [0.4, 2.1, 3.7, 5.2],
  back: [1.3, 4.4, 0.9, 2.8],
}

const creasesAt = (x: number, y: number, face: Face, d: BagDimensionsM) => {
  const reach = Math.min(d.width, d.height) * CREASE_REACH
  const corners = [
    [-d.width / 2, -d.height / 2],
    [d.width / 2, -d.height / 2],
    [d.width / 2, d.height / 2],
    [-d.width / 2, d.height / 2],
  ]
  let total = 0
  corners.forEach(([cx, cy], i) => {
    const distSq = (x - cx) ** 2 + (y - cy) ** 2
    const weight = Math.exp(-distSq / (reach * reach))
    // Angle around the corner: equal steps of it are the fan's creases.
    const angle = Math.atan2(y - cy, x - cx)
    const phase = CREASE_PHASES[face][i]
    total +=
      weight *
      (Math.sin(CREASES_PER_CORNER * angle + phase) +
        0.35 * Math.sin(2.3 * CREASES_PER_CORNER * angle + phase * 1.7))
  })
  return total
}

// Where a point of the flat film ends up on the filled bag: (x, y) in the
// bag's own coordinates (meters, centered, front facing +z), returned as
// [x, y, z]. Seams on the left, the bottom and the top; the right-hand side
// is the fold, which rounds over with no seam.
const surfacePoint = (
  x: number,
  y: number,
  face: Face,
  d: BagDimensionsM,
  lift = 0
): [number, number, number] => {
  const sealX = SEAL_MM / 1000 / d.width
  const sealY = SEAL_MM / 1000 / d.height
  const u = x / d.width + 0.5
  const v = y / d.height + 0.5
  const pu = profile(u, sealX, 0)
  const pv = profile(v, sealY, sealY)
  const fill = pu * pv
  const depth = d.width * BULGE_RATIO

  // sqrt(fill) keeps the creases off the flat seams.
  const creases = CREASE_DEPTH_M * Math.sqrt(fill) * creasesAt(x, y, face, d)
  // Ribs run along each seam: across x on the top/bottom seams, across y
  // on the side seam (the fold side has none).
  const inSideSeal = u <= sealX
  const inEndSeal = v <= sealY || v >= 1 - sealY
  const ribs = inEndSeal
    ? Math.sin((2 * Math.PI * x) / SEAL_RIB_PITCH_M)
    : inSideSeal
      ? Math.sin((2 * Math.PI * y) / SEAL_RIB_PITCH_M)
      : 0

  const z = SEAM_HALF_GAP_M + lift + depth * fill + creases + SEAL_RIB_DEPTH_M * ribs
  const bend = d.height * BEND_RATIO * (1 - Math.pow((2 * y) / d.height, 2))

  // The draw-in follows a plain arc along each edge - deepest at its middle,
  // easing to nothing at the corners - so the outline curves smoothly.
  const arcU = Math.sin(Math.PI * Math.min(Math.max(u, 0), 1))
  const arcV = Math.sin(Math.PI * Math.min(Math.max(v, 0), 1))
  return [
    x - Math.sign(x) * EDGE_DRAW_IN * depth * arcV * Math.pow(Math.abs(2 * u - 1), 3),
    y - Math.sign(y) * EDGE_DRAW_IN * depth * 0.7 * arcU * Math.pow(Math.abs(2 * v - 1), 3),
    (face === "front" ? z : -z) + bend,
  ]
}

// The flap's free edge, traced over the front surface - a faint line so the
// flap reads as a separate layer even when it's the same color as the bag.
const SEGMENTS_ON_EDGE = 64
const flapEdgePoints = (d: BagDimensionsM): [number, number, number][] => {
  const y = d.height / 2 - d.flapHeight
  return Array.from({ length: SEGMENTS_ON_EDGE + 1 }, (_, i) => {
    // Stops just short of the bag's sides so it never pokes past them.
    const inset = SEAM_HALF_GAP_M * 2
    const x = -d.width / 2 + inset + ((d.width - inset * 2) * i) / SEGMENTS_ON_EDGE
    return surfacePoint(x, y, "front", d, FLAP_LIFT_M * 1.5)
  })
}

// A face surface: a subdivided plane, optionally turned to face -z (the
// back) or with its UVs turned 180° (the folded flap), then shaped onto the
// filled bag.
const buildSurface = (
  d: BagDimensionsM,
  height: number,
  centerY: number,
  face: Face,
  options: { flipUv?: boolean; lift?: number } = {}
) => {
  const geometry = new THREE.PlaneGeometry(
    d.width,
    height,
    Math.max(8, Math.round(d.width * SEGMENTS_PER_M)),
    Math.max(4, Math.round(height * SEGMENTS_PER_M))
  )
  if (face === "back") geometry.rotateY(Math.PI)
  geometry.translate(0, centerY, 0)

  if (options.flipUv) {
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i))
  }

  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const [x, y, z] = surfacePoint(position.getX(i), position.getY(i), face, d, options.lift)
    position.setXYZ(i, x, y, z)
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

// The bag sealed and standing upright, front toward the camera, with
// something inside - thin glossy film, softly creased. The back is the same film seen from behind,
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
          {/* Poly film: glossy, rather than matte board. */}
          <meshPhysicalMaterial
            map={faceTextures[panelName] ?? null}
            color={faceTextures[panelName] ? "#ffffff" : DEFAULT_FILM_COLOR}
            roughness={0.32}
            metalness={0}
            clearcoat={0.8}
            clearcoatRoughness={0.18}
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
