"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { RoundedBoxGeometry } from "three-stdlib"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import {
  renderPanelTexture,
  inlineImagesAsDataUrls,
  DEFAULT_BOARD_COLOR,
} from "../../utils/panel-texture"
import { warmUpFont } from "../../utils/measure-text"
import { getGrainTexture } from "../../utils/grain-texture"

const TEXTURE_PX_PER_MM = 8

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
}

// Physical panel names generateFefco0201 always produces, matching
// panel-semantics.ts's front/right/back/left mapping.
const PANEL_NAMES = {
  front: "Panel-L1",
  right: "Panel-W1",
  back: "Panel-L2",
  left: "Panel-W2",
} as const

// content.url is the only field a browser-side <canvas>/WebGL texture
// operation can taint on - fetching it through this same-origin asset
// proxy (app/api/design-assets/proxy) is what lets inlineImagesAsDataUrls
// actually read a customer's uploaded logo's bytes without a CORS error
// (Medusa's /static route sends no CORS headers at all).
const proxyUrlFor = (originalUrl: string) =>
  `/api/design-assets/proxy?url=${encodeURIComponent(originalUrl)}`

// Owns texture generation - a plain untextured board-color material shows
// immediately, swapped for the real per-face textures once the async
// pipeline (font/image warmup -> rasterize 4 panels) resolves.
const BoxMesh = ({ panels, resolvedLayout, backgroundColors, dimensionsM }: BoxMeshProps) => {
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

  const [textures, setTextures] = useState<Record<string, THREE.CanvasTexture> | null>(null)
  // Bumped on every effect run, checked before committing its result - a
  // rapid sequence of design changes (e.g. clicking through Marka Kiti
  // themes quickly) can start a second generation before the first's
  // several await points resolve; only the LATEST run's result should
  // ever be committed.
  const generationRef = useRef(0)

  useEffect(() => {
    if (!resolvedLayout) {
      setTextures(null)
      return
    }

    const generation = ++generationRef.current

    const run = async () => {
      const fontPairs = new Map<string, { font: string; weight: number }>()
      for (const el of resolvedLayout.panels.flatMap((p) => p.elements)) {
        if (el.elementType !== "text") continue
        const font = el.content.font
        if (typeof font !== "string") continue
        const weight = typeof el.content.fontWeight === "number" ? el.content.fontWeight : 400
        fontPairs.set(`${font}/${weight}`, { font, weight })
      }

      // Same canvas-font-readiness guard already needed twice today for
      // measurement/rendering - rasterization is a third consumer of the
      // exact same underlying issue (a canvas op silently substitutes a
      // fallback font if the real one hasn't finished loading yet).
      const [inlinedLayout] = await Promise.all([
        inlineImagesAsDataUrls(resolvedLayout, proxyUrlFor),
        Promise.all(Array.from(fontPairs.values()).map((p) => warmUpFont(p.font, p.weight))),
      ])

      const mainPanels = Object.values(PANEL_NAMES)
        .map((name) => panels.find((p) => p.panelName === name))
        .filter((p): p is PanelGeometry => !!p)

      const rendered = await Promise.all(
        mainPanels.map((panel) =>
          renderPanelTexture(
            panel,
            inlinedLayout,
            backgroundColors?.[panel.panelName],
            TEXTURE_PX_PER_MM
          )
        )
      )

      if (generationRef.current !== generation) return // superseded - discard

      const next: Record<string, THREE.CanvasTexture> = {}
      mainPanels.forEach((panel, i) => {
        const texture = new THREE.CanvasTexture(rendered[i].canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        next[panel.panelName] = texture
      })

      setTextures((prev) => {
        if (prev) Object.values(prev).forEach((t) => t.dispose())
        return next
      })
    }

    // Best-effort preview - one failed logo fetch or a font that never
    // loads shouldn't crash the whole 3D view, just leave it showing
    // whatever it had before (or the plain fallback materials, on the
    // very first generation).
    run().catch((err) => {
      console.error("3D box preview: texture generation failed", err)
    })
  }, [resolvedLayout, backgroundColors, panels])

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

  return <mesh geometry={geometry} material={materials} />
}

export default BoxMesh
