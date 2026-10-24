"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Line } from "@react-three/drei"
import { RoundedBoxGeometry } from "three-stdlib"
import type { ThreeEvent } from "@react-three/fiber"
import { COURIER_BAG_PANEL_NAMES } from "@dtc/packaging-engine/pouch-styles"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import { usePanelTextures } from "./use-panel-textures"

// Unprinted poly mailer film - only a customer-chosen background color
// (Marka Kiti / Tema) overrides it.
export const DEFAULT_FILM_COLOR = "#f2f2ef"

// Half the closed bag's thickness - flat, with just enough body that the
// side edges read as a bag rather than a single sheet.
const HALF_THICKNESS_M = 0.002
const EDGE_RADIUS_M = 0.0015
// Each printed layer sits this far out from the one beneath it, to avoid
// z-fighting.
const LAYER_OFFSET_M = 0.0003
const FILM_ROUGHNESS = 0.55

// Same arm-then-confirm click as BoxMesh: the first click on a face only
// outlines it, a second click on the same face jumps to 2D - so an orbit
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

const MM = 1 / 1000

// One printed face: a full-size base layer in its background color, the
// print zone's texture on top of it at the zone's real position, and the
// arm outline. Laid out in the panel's own flat-dieline coordinates
// (centered, meters, facing +z) - the caller's group transform puts it on
// the bag.
const PrintedFace = ({
  panel,
  texture,
  backgroundColor,
  armed,
  onClick,
}: {
  panel: PanelGeometry
  texture?: THREE.CanvasTexture
  backgroundColor?: string
  armed: boolean
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}) => {
  const outline = boundsOf([...panel.cutLines, ...panel.creaseLines].flat())
  const zone = panel.printZones[0] ? boundsOf(panel.printZones[0].boundary) : null
  const cx = (outline.minX + outline.maxX) / 2
  const cy = (outline.minY + outline.maxY) / 2
  const w = (outline.maxX - outline.minX) * MM
  const h = (outline.maxY - outline.minY) * MM

  const corners: [number, number, number][] = [
    [-w / 2, -h / 2, 2 * LAYER_OFFSET_M],
    [w / 2, -h / 2, 2 * LAYER_OFFSET_M],
    [w / 2, h / 2, 2 * LAYER_OFFSET_M],
    [-w / 2, h / 2, 2 * LAYER_OFFSET_M],
    [-w / 2, -h / 2, 2 * LAYER_OFFSET_M],
  ]

  return (
    <group onClick={onClick}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={backgroundColor ?? DEFAULT_FILM_COLOR}
          roughness={FILM_ROUGHNESS}
          metalness={0}
        />
      </mesh>
      {zone && texture && (
        <mesh
          position={[
            ((zone.minX + zone.maxX) / 2 - cx) * MM,
            ((zone.minY + zone.maxY) / 2 - cy) * MM,
            LAYER_OFFSET_M,
          ]}
        >
          <planeGeometry args={[(zone.maxX - zone.minX) * MM, (zone.maxY - zone.minY) * MM]} />
          <meshStandardMaterial map={texture} roughness={FILM_ROUGHNESS} metalness={0} />
        </mesh>
      )}
      {armed && (
        <Line points={corners} color="#000000" lineWidth={2} transparent opacity={0.6} />
      )}
    </group>
  )
}

// The bag closed and standing upright, front toward the camera: the back
// face is the same panel turned around, and the flap folds over the top of
// the front - which turns its print 180°, exactly as it reads on a real
// sealed bag.
const BagMesh = ({ panels, resolvedLayout, backgroundColors, dimensionsM, onFaceClick }: BagMeshProps) => {
  const textures = usePanelTextures(
    panels,
    PRINTED_PANELS,
    resolvedLayout,
    backgroundColors,
    DEFAULT_FILM_COLOR
  )

  const body = useMemo(
    () =>
      new RoundedBoxGeometry(
        dimensionsM.width,
        dimensionsM.height,
        HALF_THICKNESS_M * 2,
        2,
        EDGE_RADIUS_M
      ),
    [dimensionsM.width, dimensionsM.height]
  )

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

  const panelNamed = (name: string) => panels.find((p) => p.panelName === name)
  const front = panelNamed(COURIER_BAG_PANEL_NAMES.front)
  const back = panelNamed(COURIER_BAG_PANEL_NAMES.back)
  const flap = panelNamed(COURIER_BAG_PANEL_NAMES.flap)

  const faceProps = (panel: PanelGeometry) => ({
    panel,
    texture: textures?.[panel.panelName],
    backgroundColor: backgroundColors?.[panel.panelName],
    armed: armedPanel === panel.panelName,
    onClick: clickHandlerFor(panel.panelName),
  })

  return (
    <>
      <mesh geometry={body}>
        <meshStandardMaterial
          color={backgroundColors?.[COURIER_BAG_PANEL_NAMES.back] ?? DEFAULT_FILM_COLOR}
          roughness={FILM_ROUGHNESS}
          metalness={0}
        />
      </mesh>
      {front && (
        <group position={[0, 0, HALF_THICKNESS_M + LAYER_OFFSET_M]}>
          <PrintedFace {...faceProps(front)} />
        </group>
      )}
      {back && (
        <group
          position={[0, 0, -HALF_THICKNESS_M - LAYER_OFFSET_M]}
          rotation={[0, Math.PI, 0]}
        >
          <PrintedFace {...faceProps(back)} />
        </group>
      )}
      {flap && (
        // Folded over the front's top edge: turned 180° in its own plane,
        // its hinge along the bag's top, its tip `flapHeight` further down.
        <group
          position={[
            0,
            dimensionsM.height / 2 - dimensionsM.flapHeight / 2,
            HALF_THICKNESS_M + 4 * LAYER_OFFSET_M,
          ]}
          rotation={[0, 0, Math.PI]}
        >
          <PrintedFace {...faceProps(flap)} />
        </group>
      )}
    </>
  )
}

export default BagMesh
