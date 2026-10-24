"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Line } from "@react-three/drei"
import { RoundedBoxGeometry } from "three-stdlib"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import { DEFAULT_BOARD_COLOR } from "../../utils/panel-texture"
import { getGrainTexture } from "../../utils/grain-texture"
import { usePanelTextures } from "./use-panel-textures"

// RoundedBoxGeometry clamps this to at most half the smallest box
// dimension itself, so a tiny custom size degrades gracefully instead of
// self-intersecting.
const EDGE_RADIUS_M = 0.003

// Real board grain doesn't scale with a face's size - repeat it roughly
// every 25mm of actual board regardless of box/panel dimensions, so a big
// and a small box both read as the same physical cardboard.
const GRAIN_TILE_M = 0.025
const BUMP_SCALE = 0.00025
const BOARD_ROUGHNESS = 0.9

export type Dimensions3D = { length: number; width: number; height: number }

type BoxMeshProps = {
  panels: PanelGeometry[]
  resolvedLayout?: ResolvedLayout | null
  backgroundColors?: Record<string, string>
  dimensionsM: Dimensions3D
  /** Fires with the physical panel name of whichever printed face was
   *  clicked (front/right/back/left - never top/bottom, they're never
   *  printed and have no elements to edit). Omit to make the box
   *  click-through (e.g. a pure preview with no 2D editor to jump to). */
  onFaceClick?: (panelName: string) => void
}

// Physical panel names generateFefco0201 always produces, matching
// panel-semantics.ts's front/right/back/left mapping.
const PANEL_NAMES = {
  front: "Panel-L1",
  right: "Panel-W1",
  back: "Panel-L2",
  left: "Panel-W2",
} as const

const MAIN_PANEL_NAMES = Object.values(PANEL_NAMES)

type FaceKey = "right" | "left" | "front" | "back"

// Mirrors the materials array's own [+x, -x, +y, -y, +z, -z] order below -
// three.js sets Intersection.face.materialIndex to whichever of the 6
// groups a raycast hit belongs to, for a mesh with a material array. Top/
// bottom (indices 2/3) are deliberately absent - they're never printed,
// so a click there has nothing to jump to (and can never become
// `armedFace` below either).
const FACE_MATERIAL_INDEX_TO_KEY: Record<number, FaceKey> = {
  0: "right",
  1: "left",
  4: "front",
  5: "back",
}

// How long an armed (first-clicked) face stays armed with no further
// click, before quietly disarming - otherwise a face clicked once, then
// left alone, would still jump to 2D on some unrelated click much later.
const ARM_TIMEOUT_MS = 4000

// A thin border outline is the ONLY visual change an armed face gets - its
// own material/board color stays exactly what it already was (the point
// is to still read as plain kraft board, not a highlighted/selected
// color), and only right/left/front/back can ever show one - top/bottom
// aren't clickable at all, so they never get a border either. Points are
// nudged OUTLINE_OFFSET_M past the true surface to avoid z-fighting with
// the mesh underneath.
const OUTLINE_OFFSET_M = 0.001

// Top/bottom are flat, untextured faces (never printed) - but a plain flat
// top reads as a lidless block rather than a closed box. Real FEFCO 0201
// assembly folds the major flaps (attached to the LONG panels, front/back -
// Panel-L1/L2) in last, and their free edges meet at the box's center,
// running the full length of the box. That seam is the only visual cue a
// flat top needs to read as "this has a lid".
const TOP_SEAM_OFFSET_M = 0.0005

const topSeamPoints = (dimensionsM: Dimensions3D): [number, number, number][] => {
  const hx = dimensionsM.length / 2
  const y = dimensionsM.height / 2 + TOP_SEAM_OFFSET_M
  return [[-hx, y, 0], [hx, y, 0]]
}

const faceOutlinePoints = (
  faceKey: FaceKey,
  dimensionsM: Dimensions3D
): [number, number, number][] => {
  const hx = dimensionsM.length / 2
  const hy = dimensionsM.height / 2
  const hz = dimensionsM.width / 2
  switch (faceKey) {
    case "front": {
      const z = hz + OUTLINE_OFFSET_M
      return [[-hx, -hy, z], [hx, -hy, z], [hx, hy, z], [-hx, hy, z], [-hx, -hy, z]]
    }
    case "back": {
      const z = -hz - OUTLINE_OFFSET_M
      return [[-hx, -hy, z], [hx, -hy, z], [hx, hy, z], [-hx, hy, z], [-hx, -hy, z]]
    }
    case "right": {
      const x = hx + OUTLINE_OFFSET_M
      return [[x, -hy, -hz], [x, -hy, hz], [x, hy, hz], [x, hy, -hz], [x, -hy, -hz]]
    }
    case "left": {
      const x = -hx - OUTLINE_OFFSET_M
      return [[x, -hy, -hz], [x, -hy, hz], [x, hy, hz], [x, hy, -hz], [x, -hy, -hz]]
    }
  }
}

// Owns texture generation - a plain untextured board-color material shows
// immediately, swapped for the real per-face textures once the async
// pipeline (see usePanelTextures) resolves.
const BoxMesh = ({
  panels,
  resolvedLayout,
  backgroundColors,
  dimensionsM,
  onFaceClick,
}: BoxMeshProps) => {
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        dimensionsM.length,
        dimensionsM.height,
        dimensionsM.width,
        3,
        EDGE_RADIUS_M
      ),
    [dimensionsM.length, dimensionsM.width, dimensionsM.height]
  )

  // First click on a face arms it (shows the outline below, doesn't
  // navigate); a second click on that SAME face is what actually fires
  // onFaceClick. Without this, a small OrbitControls drag that happens to
  // start and end over the same face still counts as a native "click" and
  // was jumping to 2D on every minor orbit adjustment.
  const [armedFace, setArmedFace] = useState<FaceKey | null>(null)
  const armTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current)
    }
  }, [])

  const textures = usePanelTextures(panels, MAIN_PANEL_NAMES, resolvedLayout, backgroundColors)

  const materials = useMemo(() => {
    const grain = getGrainTexture()

    // Each face gets its own clone so its repeat can match that face's own
    // real-world size (grain.clone() is a cheap ~128x128 canvas re-upload,
    // not a re-generation) - a shared texture with one repeat would make
    // the grain look coarser on the shorter faces than the longer ones.
    const grainFor = (faceWidthM: number, faceHeightM: number) => {
      const faceGrain = grain.clone()
      faceGrain.repeat.set(faceWidthM / GRAIN_TILE_M, faceHeightM / GRAIN_TILE_M)
      faceGrain.needsUpdate = true
      return faceGrain
    }

    const materialFor = (panelName: string, faceWidthM: number, faceHeightM: number) => {
      const texture = textures?.[panelName]
      const faceGrain = grainFor(faceWidthM, faceHeightM)
      return new THREE.MeshStandardMaterial({
        ...(texture ? { map: texture } : { color: DEFAULT_BOARD_COLOR }),
        roughness: BOARD_ROUGHNESS,
        metalness: 0,
        bumpMap: faceGrain,
        bumpScale: BUMP_SCALE,
        roughnessMap: faceGrain,
      })
    }

    const flatMaterialFor = (faceWidthM: number, faceHeightM: number) => {
      const faceGrain = grainFor(faceWidthM, faceHeightM)
      return new THREE.MeshStandardMaterial({
        color: DEFAULT_BOARD_COLOR,
        roughness: BOARD_ROUGHNESS,
        metalness: 0,
        bumpMap: faceGrain,
        bumpScale: BUMP_SCALE,
        roughnessMap: faceGrain,
      })
    }

    // BoxGeometry's material-array order is [+x, -x, +y, -y, +z, -z].
    // X-extent = length -> +-x are the width panels (right/left);
    // Z-extent = width -> +-z are the length panels (front/back);
    // Y-extent = height -> +-y are the never-printed top/bottom flaps.
    // +z = front deliberately, so it's camera-facing at the default orbit
    // angle (three.js's default camera looks toward -Z).
    return [
      materialFor(PANEL_NAMES.right, dimensionsM.width, dimensionsM.height),
      materialFor(PANEL_NAMES.left, dimensionsM.width, dimensionsM.height),
      flatMaterialFor(dimensionsM.length, dimensionsM.width),
      flatMaterialFor(dimensionsM.length, dimensionsM.width),
      materialFor(PANEL_NAMES.front, dimensionsM.length, dimensionsM.height),
      materialFor(PANEL_NAMES.back, dimensionsM.length, dimensionsM.height),
    ]
  }, [textures, dimensionsM.length, dimensionsM.width, dimensionsM.height])

  return (
    <>
      <mesh
        geometry={geometry}
        material={materials}
        onClick={
          onFaceClick &&
          ((event) => {
            // Otherwise a click "through" the box would also fire
            // OrbitControls' own click-adjacent handling and any parent
            // scene listeners - this mesh is the only thing a click on the
            // box should ever mean.
            event.stopPropagation()
            const materialIndex = event.face?.materialIndex
            const faceKey =
              materialIndex !== undefined ? FACE_MATERIAL_INDEX_TO_KEY[materialIndex] : undefined
            if (armTimeoutRef.current) clearTimeout(armTimeoutRef.current)

            if (!faceKey) {
              // Hit the top/bottom - not clickable, and clears whatever
              // was armed rather than leaving it silently waiting.
              setArmedFace(null)
              return
            }
            if (armedFace === faceKey) {
              setArmedFace(null)
              onFaceClick(PANEL_NAMES[faceKey])
              return
            }
            setArmedFace(faceKey)
            armTimeoutRef.current = setTimeout(() => setArmedFace(null), ARM_TIMEOUT_MS)
          })
        }
      />
      <Line
        points={topSeamPoints(dimensionsM)}
        color="#000000"
        lineWidth={1}
        transparent
        opacity={0.18}
      />
      {armedFace && (
        <Line
          points={faceOutlinePoints(armedFace, dimensionsM)}
          color="#ffffff"
          lineWidth={2.5}
          transparent
          opacity={0.85}
          depthTest={false}
        />
      )}
    </>
  )
}

export default BoxMesh
