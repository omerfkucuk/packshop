"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout } from "@dtc/layout-engine"
import { renderPanelTexture, inlineImagesAsDataUrls } from "../../utils/panel-texture"
import { warmUpFont } from "../../utils/measure-text"
import { buildEmbeddedFontFaceCss } from "../../utils/embed-font"

const TEXTURE_PX_PER_MM = 8

// content.url is the only field a browser-side <canvas>/WebGL texture
// operation can taint on - fetching it through this same-origin asset
// proxy (app/api/design-assets/proxy) is what lets inlineImagesAsDataUrls
// actually read a customer's uploaded logo's bytes without a CORS error
// (Medusa's /static route sends no CORS headers at all).
const proxyUrlFor = (originalUrl: string) =>
  `/api/design-assets/proxy?url=${encodeURIComponent(originalUrl)}`

// Rasterizes each named panel's print zone into a THREE.CanvasTexture,
// keyed by panel name. null until the first generation resolves, so a mesh
// can show plain fallback materials immediately.
export function usePanelTextures(
  panels: PanelGeometry[],
  panelNames: readonly string[],
  resolvedLayout: ResolvedLayout | null | undefined,
  backgroundColors: Record<string, string> | undefined,
  materialColor?: string
): Record<string, THREE.CanvasTexture> | null {
  const [textures, setTextures] = useState<Record<string, THREE.CanvasTexture> | null>(null)
  // Bumped on every effect run, checked before committing its result - a
  // rapid sequence of design changes (e.g. clicking through Marka Kiti
  // themes quickly) can start a second generation before the first's
  // several await points resolve; only the LATEST run's result should
  // ever be committed.
  const generationRef = useRef(0)
  const panelNamesKey = panelNames.join("|")

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
      // fontFaceCss is a DIFFERENT fix for a related-but-distinct problem:
      // even once warmed, the page's loaded Google Fonts <link> is
      // invisible to the isolated Blob-<img> context each panel's texture
      // rasterizes through - see embed-font.ts for why every panel's text
      // was silently rendering in the same fallback font regardless of
      // which one was actually chosen.
      const [inlinedLayout, , fontFaceCss] = await Promise.all([
        inlineImagesAsDataUrls(resolvedLayout, proxyUrlFor),
        Promise.all(Array.from(fontPairs.values()).map((p) => warmUpFont(p.font, p.weight))),
        buildEmbeddedFontFaceCss(Array.from(fontPairs.values())),
      ])

      const texturedPanels = panelNamesKey
        .split("|")
        .map((name) => panels.find((p) => p.panelName === name))
        .filter((p): p is PanelGeometry => !!p)

      const rendered = await Promise.all(
        texturedPanels.map((panel) =>
          renderPanelTexture(
            panel,
            inlinedLayout,
            backgroundColors?.[panel.panelName],
            TEXTURE_PX_PER_MM,
            fontFaceCss,
            materialColor
          )
        )
      )

      if (generationRef.current !== generation) return // superseded - discard

      const next: Record<string, THREE.CanvasTexture> = {}
      texturedPanels.forEach((panel, i) => {
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
      console.error("3D preview: texture generation failed", err)
    })
  }, [resolvedLayout, backgroundColors, panels, panelNamesKey, materialColor])

  return textures
}
