"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout, ResolvedElement } from "@dtc/layout-engine"
import { renderPanelTexture, preloadImageUrls } from "../../utils/panel-texture"
import { warmUpFont } from "../../utils/measure-text"

// Plain kraft-cardboard tan - flaps (top/bottom) never carry print content
// (fefco-0201.ts never gives them a printZones entry), so there's nothing
// to texture them with.
const DEFAULT_BOARD_COLOR = "#c9a877"
const TEXTURE_PX_PER_MM = 8

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
// operation can taint on - rewriting it through the same-origin asset
// proxy (app/api/design-assets/proxy) is what lets renderPanelTexture
// actually rasterize a customer's uploaded logo without a SecurityError.
// Kept at this one call site (not inside panel-texture.ts itself) so that
// file stays agnostic of the proxy strategy.
function proxyImageUrls(layout: ResolvedLayout): ResolvedLayout {
  const rewrite = (el: ResolvedElement): ResolvedElement => {
    const url = el.content.url
    if (typeof url !== "string") return el
    return {
      ...el,
      content: { ...el.content, url: `/api/design-assets/proxy?url=${encodeURIComponent(url)}` },
    }
  }
  return {
    ...layout,
    panels: layout.panels.map((p) => ({ ...p, elements: p.elements.map(rewrite) })),
  }
}

// Owns texture generation - a plain untextured (board-color/white)
// material shows immediately, swapped for the real per-face textures once
// the async pipeline (font/image warmup -> rasterize 4 panels) resolves.
const BoxMesh = ({ panels, resolvedLayout, backgroundColors, dimensionsM }: BoxMeshProps) => {
  const geometry = useMemo(
    () => new THREE.BoxGeometry(dimensionsM.length, dimensionsM.height, dimensionsM.width),
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
    const proxiedLayout = proxyImageUrls(resolvedLayout)
    const allElements = proxiedLayout.panels.flatMap((p) => p.elements)

    const run = async () => {
      const urls = allElements
        .map((el) => el.content.url)
        .filter((url): url is string => typeof url === "string")

      const fontPairs = new Map<string, { font: string; weight: number }>()
      for (const el of allElements) {
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
      await Promise.all([
        preloadImageUrls(urls),
        Promise.all(Array.from(fontPairs.values()).map((p) => warmUpFont(p.font, p.weight))),
      ])

      const mainPanels = Object.values(PANEL_NAMES)
        .map((name) => panels.find((p) => p.panelName === name))
        .filter((p): p is PanelGeometry => !!p)

      const rendered = await Promise.all(
        mainPanels.map((panel) =>
          renderPanelTexture(
            panel,
            proxiedLayout,
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
    const materialFor = (panelName: string) => {
      const texture = textures?.[panelName]
      return new THREE.MeshStandardMaterial(texture ? { map: texture } : { color: "#ffffff" })
    }
    // BoxGeometry's material-array order is [+x, -x, +y, -y, +z, -z].
    // X-extent = length -> +-x are the width panels (right/left);
    // Z-extent = width -> +-z are the length panels (front/back);
    // Y-extent = height -> +-y are the never-printed top/bottom flaps.
    // +z = front deliberately, so it's camera-facing at the default orbit
    // angle (three.js's default camera looks toward -Z).
    return [
      materialFor(PANEL_NAMES.right),
      materialFor(PANEL_NAMES.left),
      new THREE.MeshStandardMaterial({ color: DEFAULT_BOARD_COLOR }),
      new THREE.MeshStandardMaterial({ color: DEFAULT_BOARD_COLOR }),
      materialFor(PANEL_NAMES.front),
      materialFor(PANEL_NAMES.back),
    ]
  }, [textures])

  return <mesh geometry={geometry} material={materials} />
}

export default BoxMesh
