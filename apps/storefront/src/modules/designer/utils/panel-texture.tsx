import { renderToStaticMarkup } from "react-dom/server"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import { zoneOrigin } from "@dtc/packaging-engine/placement"
import type { ResolvedLayout, ResolvedElement } from "@dtc/layout-engine"
import { elementsTouchingPanel } from "@dtc/layout-engine/constraints"
import { ELEMENT_LIBRARY } from "./element-library"
import { renderElementVisual } from "../components/dieline-preview/render-element-visual"

// Cap on a single face texture's largest dimension - a very large custom
// box at a naive fixed px-per-mm could otherwise produce an oversized
// texture and hit a GPU texture-size cliff.
const MAX_TEXTURE_PX = 2048

// Plain kraft-cardboard tan - a real FEFCO 0201 box is uncoated corrugated
// board by default (not white), so an unprinted panel should read as
// "bare cardboard," the same color the 3D preview's never-printed top/
// bottom flaps already use (box-mesh.tsx), not a printed-white-board look
// nobody asked for. Only a customer-chosen background color (Marka Kiti /
// Tema) overrides this.
export const DEFAULT_BOARD_COLOR = "#c9a877"

export interface PanelTextureResult {
  canvas: HTMLCanvasElement
  widthMm: number
  heightMm: number
}

// Rasterizes one main panel's print zone (background color + every element
// that touches it) into a <canvas>, for use as a THREE.CanvasTexture face
// on the 3D box preview. Reuses renderElementVisual - the SAME render
// logic DielinePreview's live 2D SVG uses - so there is exactly one
// implementation of "how does element X render," never two that can drift
// apart (see that function's own comment for why that matters here).
//
// `resolvedLayout` is the FULL layout (every panel), not just this one -
// elementsTouchingPanel (already built for the wrap feature) pulls out
// both this panel's own elements AND any neighbor's element that wraps
// onto it (secondaryPanelName), so a wrap element that only partially
// overlaps this panel's zone still appears here, cropped by the clipPath
// below exactly at the seam - the same crop a real fold would produce.
// Logo/image URLs in `resolvedLayout` must already be rewritten to go
// through the same-origin asset proxy (see app/api/design-assets/proxy) -
// this function doesn't do that itself, so it stays agnostic of that
// concern and reusable if the proxy strategy ever changes.
export async function renderPanelTexture(
  panel: PanelGeometry,
  resolvedLayout: ResolvedLayout,
  backgroundColor: string | undefined,
  pxPerMm: number,
  fontFaceCss?: string
): Promise<PanelTextureResult> {
  const zone = panel.printZones[0]
  if (!zone) {
    throw new Error(`renderPanelTexture: panel "${panel.panelName}" has no print zone`)
  }

  const origin = zoneOrigin(zone)
  const { w: widthMm, h: heightMm } = zone.boundingBox
  // Y-flip scoped to just THIS panel's own local bounds (an involution
  // over [origin.y, origin.y + heightMm]) - unlike DielinePreview's
  // whole-dieline flip, since this SVG only ever contains one panel.
  const flipY = (y: number) => origin.y * 2 + heightMm - y

  const elements = [...elementsTouchingPanel(resolvedLayout, panel.panelName)].sort(
    (a, b) => a.zIndex - b.zIndex
  )

  const clipId = `panel-clip-${panel.panelName}`
  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${origin.x} ${origin.y} ${widthMm} ${heightMm}`}
      width={widthMm}
      height={heightMm}
    >
      <defs>
        {/* Self-contained (data: URI) @font-face rules - this SVG gets
            rasterized via a Blob <img>, an isolated context that can't see
            the page's own loaded Google Fonts <link>, so without this
            every font silently fell back to the same one. See
            embed-font.ts for the why in full. */}
        {fontFaceCss && <style>{fontFaceCss}</style>}
        {/* Scoped exactly to the zone's own bounds - what actually crops a
            wrap element cleanly at the seam, whether flipped or not (a
            rectangle spanning the whole zone looks identical either way). */}
        <clipPath id={clipId}>
          <rect x={origin.x} y={origin.y} width={widthMm} height={heightMm} />
        </clipPath>
        {ELEMENT_LIBRARY.map((item) => (
          <symbol key={item.id} id={`library-element-${item.id}`} viewBox={item.viewBox}>
            {item.markup}
          </symbol>
        ))}
      </defs>
      <rect
        x={origin.x}
        y={origin.y}
        width={widthMm}
        height={heightMm}
        fill={backgroundColor ?? DEFAULT_BOARD_COLOR}
      />
      <g clipPath={`url(#${clipId})`}>
        {elements.map((el) => {
          const x = el.position.x
          const y = flipY(el.position.y + el.size.h)
          const textCenterX = el.position.x + el.size.w / 2
          const textCenterY = flipY(el.position.y + el.size.h / 2)
          const visual = renderElementVisual(el, x, y, textCenterX, textCenterY, el.size)
          return visual ? <g key={el.elementId}>{visual}</g> : null
        })}
      </g>
    </svg>
  )

  const svgString = renderToStaticMarkup(svg)
  const objectUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml" }))

  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()

    const scale = Math.min(pxPerMm, MAX_TEXTURE_PX / Math.max(widthMm, heightMm))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(widthMm * scale))
    canvas.height = Math.max(1, Math.round(heightMm * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("renderPanelTexture: 2d canvas context unavailable")
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    return { canvas, widthMm, heightMm }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// Fetches `url` (must already be same-origin - see the proxy note on
// inlineImagesAsDataUrls below) and returns it as a data: URI.
async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`fetchAsDataUrl: ${url} responded ${response.status}`)
  }
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"))
    reader.readAsDataURL(blob)
  })
}

// Replaces every element's content.url with a data: URI holding the same
// image, fully embedded in-line. This is NOT just an optimization: a
// per-panel texture SVG (renderPanelTexture) gets loaded via an <img> from
// a Blob, and a browser's outer "the SVG is decoded" signal does not
// reliably wait for that SVG's own NESTED <image href="..."> references to
// finish loading first - decode()/onload can fire before a referenced
// raster image has actually arrived, silently rasterizing a blank patch
// where it should be (confirmed live: a logo added no visible errors, no
// rejected promise, just never appeared - this exact race). A true data:
// URI has no nested fetch to race at all - the bytes are already sitting
// right there in the SVG string. `proxyUrlFor` builds the same-origin
// asset-proxy URL each original url needs to be fetched through (Medusa's
// /static route sends no CORS headers - see app/api/design-assets/proxy).
export async function inlineImagesAsDataUrls(
  layout: ResolvedLayout,
  proxyUrlFor: (originalUrl: string) => string
): Promise<ResolvedLayout> {
  const originalUrls = new Set<string>()
  for (const el of layout.panels.flatMap((p) => p.elements)) {
    if (typeof el.content.url === "string") originalUrls.add(el.content.url)
  }

  const dataUrlByOriginal = new Map<string, string>()
  await Promise.all(
    Array.from(originalUrls).map(async (original) => {
      dataUrlByOriginal.set(original, await fetchAsDataUrl(proxyUrlFor(original)))
    })
  )

  const rewrite = (el: ResolvedElement): ResolvedElement => {
    const url = el.content.url
    if (typeof url !== "string") return el
    const dataUrl = dataUrlByOriginal.get(url)
    return dataUrl ? { ...el, content: { ...el.content, url: dataUrl } } : el
  }

  return {
    ...layout,
    panels: layout.panels.map((p) => ({ ...p, elements: p.elements.map(rewrite) })),
  }
}
