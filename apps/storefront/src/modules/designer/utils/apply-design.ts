import type { Dimensions, PanelGeometry } from "@dtc/packaging-engine/shared"
import {
  resolveLayout,
  DEFAULT_SQUARE_BUCKETS,
  type AnchorPoint,
  type CompositionPlan,
  type ResolvedLayout,
  type SemanticPlacement,
} from "@dtc/layout-engine"
import type { SelectedElement } from "../types"
import { FEFCO_0201_PANEL_SEMANTICS, MAIN_PANELS } from "./panel-semantics"
import { getLibraryElement } from "./element-library"

// Each selected logo is its own individually placeable instance (not
// baked once per panel) - the customer adds one via Marka Kiti, then
// drags it wherever they want, including across panels. A fresh instance
// always starts on the front panel; successive instances cycle through
// these anchors so repeated adds don't land perfectly stacked (which
// would otherwise immediately flag as an unhelpful red overlap outline).
const LOGO_ANCHOR_CYCLE: AnchorPoint[] = [
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center-left",
  "center-right",
  "top-center",
  "bottom-center",
]

// Same "one instance per add, not one per panel" treatment as logos (see
// LOGO_ANCHOR_CYCLE above) - split into two cycles because shape/pattern
// (background tier, exempt from the no-element-overlap rule) and icon
// (foreground) read best starting from different anchors.
const BACKGROUND_ELEMENT_ANCHOR_CYCLE: AnchorPoint[] = [
  "center",
  "top-left",
  "bottom-right",
  "top-right",
  "bottom-left",
]
const FOREGROUND_ELEMENT_ANCHOR_CYCLE: AnchorPoint[] = [
  "bottom-right",
  "top-left",
  "top-right",
  "bottom-left",
  "center-right",
  "center-left",
]

// Same cycle shape as the two above, kept separate so adding several
// custom-text instances in a row doesn't skip anchors already claimed by
// icons added in the same session (or vice versa).
const CUSTOM_TEXT_ANCHOR_CYCLE: AnchorPoint[] = [
  "center",
  "bottom-center",
  "top-center",
  "center-left",
  "center-right",
]

// Turns the customer's selected brand elements into a CompositionPlan: each
// selected logo placed once (front panel), the slogan (below the first
// logo, in the selected font) repeated across all 4 main faces. This is
// the "no real AI/text prompt yet" default plan - once AI composition
// exists, it produces plans through the exact same resolveLayout() call.
function buildCompositionPlan(elements: SelectedElement[]): CompositionPlan {
  const logos = elements.filter((el) => el.type === "logo")
  const slogan = elements.find((el) => el.type === "text")
  const font = elements.find((el) => el.type === "font")?.value ?? null
  const color = elements.find((el) => el.type === "color")?.value ?? null
  const libraryElements = elements.filter((el) => el.type === "library-element")
  const customTextElements = elements.filter((el) => el.type === "custom-text")

  const planElements: SemanticPlacement[] = []

  logos.forEach((logoEl, index) => {
    planElements.push({
      elementId: logoEl.id,
      elementType: "logo",
      content: { url: logoEl.value },
      sourceElementId: logoEl.id,
      placementKind: "absolute",
      panel: "front",
      anchor: LOGO_ANCHOR_CYCLE[index % LOGO_ANCHOR_CYCLE.length],
      size: slogan ? "medium" : "large",
    })
  })

  // Only the first logo instance (if any) gets a slogan tucked below it -
  // with logos now individually placeable, there's no single "the logo"
  // per panel to pair every slogan repeat against.
  const firstLogoId = logos[0]?.id ?? null

  for (const panel of MAIN_PANELS) {
    if (slogan) {
      const base = {
        elementId: `slogan-${panel}`,
        elementType: "text" as const,
        content: { text: slogan.value, font },
        sourceElementId: slogan.id,
        size: "medium" as const,
      }

      planElements.push(
        firstLogoId && panel === "front"
          ? {
              ...base,
              placementKind: "relative",
              panel,
              relativeTo: firstLogoId,
              position: "below",
              gapHint: "normal",
            }
          : {
              ...base,
              placementKind: "absolute",
              panel,
              anchor: "center",
            }
      )
    }
  }

  // Each selected library element (Elementler tab) is its own individually
  // placeable instance too, front panel by default - same "one per add,
  // not one per panel" fix as logos above.
  let backgroundElementIndex = 0
  let foregroundElementIndex = 0
  for (const selected of libraryElements) {
    const entry = getLibraryElement(selected.value)
    if (!entry) continue

    // shape/pattern are the background tier (exempt from the
    // no-element-overlap rule, see constraints/rules/no-element-overlap.ts).
    const isBackgroundTier = entry.category === "shape" || entry.category === "pattern"
    const anchor = isBackgroundTier
      ? BACKGROUND_ELEMENT_ANCHOR_CYCLE[
          backgroundElementIndex++ % BACKGROUND_ELEMENT_ANCHOR_CYCLE.length
        ]
      : FOREGROUND_ELEMENT_ANCHOR_CYCLE[
          foregroundElementIndex++ % FOREGROUND_ELEMENT_ANCHOR_CYCLE.length
        ]

    planElements.push({
      elementId: selected.id,
      elementType: entry.category,
      content: {
        libraryElementId: entry.id,
        color: entry.recolorable && color ? color : undefined,
      },
      sourceElementId: selected.id,
      placementKind: "absolute",
      panel: "front",
      anchor,
      // "large" (a square-ish bucket), not "full-width" (a wide-but-short
      // one) - these library symbols have square viewBoxes, and a wide
      // box just letterboxes a square symbol down to its short axis.
      size: isBackgroundTier ? "large" : "small",
    })
  }

  // Each Yazı-tool text (the "Aa" combo picker, not the brand slogan above)
  // is its own individually placeable instance, front panel by default -
  // same "one per add, not repeated across every panel" treatment as logos
  // and library elements, deliberately NOT the slogan's
  // "elements.find((el) => el.type === 'text')" repeat-on-every-panel
  // behavior above (that's a different SelectedElementType on purpose).
  customTextElements.forEach((textEl, index) => {
    planElements.push({
      elementId: textEl.id,
      elementType: "text",
      content: {
        text: textEl.value,
        font: textEl.fontFamily,
        fontWeight: textEl.fontWeight,
        uppercase: textEl.uppercase,
      },
      sourceElementId: textEl.id,
      placementKind: "absolute",
      panel: "front",
      anchor: CUSTOM_TEXT_ANCHOR_CYCLE[index % CUSTOM_TEXT_ANCHOR_CYCLE.length],
      size: "medium",
    })
  })

  return { version: "1.0", boxType: "fefco-0201", elements: planElements }
}

// A "small"/"medium"/"large" SizeHint normally resolves to a SQUARE box
// (fraction of the zone's smaller dimension, both axes) - fine for the
// hand-drawn library shapes, wrong for a real uploaded logo, whose actual
// pixel aspect ratio is rarely square (e.g. a wordmark like "LC Waikiki" is
// wide and short). Without this, the logo still rendered at the square
// bucket's size and got letterboxed inside it (image kept its own aspect
// ratio via preserveAspectRatio, just with visible empty space top/bottom
// or left/right - looking like an oversized, padded frame around the
// actual artwork). Targets the SAME longest-edge fraction the square
// bucket would have, just distributed across width/height by the image's
// real aspect ratio instead of forced 1:1.
// Exported for apply-theme.ts, which places a brand logo through the exact
// same resolveLayout() call and needs the identical fix.
export function computeAspectPreservingSize(
  el: SemanticPlacement,
  panels: PanelGeometry[],
  imageNaturalSizes: Record<string, Dimensions>
): Dimensions | null {
  const url = typeof el.content?.url === "string" ? el.content.url : null
  const natural = url ? imageNaturalSizes[url] : null
  if (!natural || natural.w <= 0 || natural.h <= 0) return null // not probed yet - square bucket fallback

  const physicalPanelName = FEFCO_0201_PANEL_SEMANTICS[el.panel]
  const zone = panels.find((p) => p.panelName === physicalPanelName)?.printZones[0]
  if (!zone) return null

  const minDim = Math.min(zone.boundingBox.w, zone.boundingBox.h)
  const fraction =
    DEFAULT_SQUARE_BUCKETS[el.size as keyof typeof DEFAULT_SQUARE_BUCKETS] ??
    DEFAULT_SQUARE_BUCKETS.medium
  const targetLongEdge = minDim * fraction
  const aspect = natural.w / natural.h

  return aspect >= 1
    ? { w: targetLongEdge, h: targetLongEdge / aspect }
    : { w: targetLongEdge * aspect, h: targetLongEdge }
}

const TEXT_MEASURE_REFERENCE_PX = 100

// Lazily created (canvas is browser-only) and reused across calls - a
// fresh <canvas> per measurement would work too, just wastefully.
let measureCanvasCtx: CanvasRenderingContext2D | null | undefined

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCanvasCtx !== undefined) return measureCanvasCtx
  measureCanvasCtx =
    typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")
  return measureCanvasCtx
}

// A text element's real, measured glyph-run aspect ratio (canvas
// measureText's tight actualBoundingBox* metrics, not the full em-square
// line-height) - the same "hug the artwork" fix computeAspectPreservingSize
// above already made for real uploaded logos, and the tightened
// library-element viewBoxes made for the hand-drawn shapes. Without it,
// every text element (no natural size of its own, unlike an image) fell
// back to the same forced-SQUARE SizeHint bucket everything sizeless gets -
// a short word and a long one resolved to the exact same square box, so
// the selection frame read as a loose, mostly-empty square around the
// actual (much narrower, much shorter) visible glyphs.
export function computeTextAspectSize(
  el: SemanticPlacement,
  panels: PanelGeometry[]
): Dimensions | null {
  if (el.elementType !== "text") return null

  const text = typeof el.content?.text === "string" ? el.content.text : null
  const font = typeof el.content?.font === "string" ? el.content.font : null
  if (!text || !font) return null

  const ctx = getMeasureContext()
  if (!ctx) return null // SSR, or no canvas support - square bucket fallback

  const fontWeight = typeof el.content?.fontWeight === "number" ? el.content.fontWeight : 400
  const uppercase = el.content?.uppercase === true
  ctx.font = `${fontWeight} ${TEXT_MEASURE_REFERENCE_PX}px "${font}"`
  const metrics = ctx.measureText(uppercase ? text.toUpperCase() : text)

  const width = metrics.width
  const height =
    (metrics.actualBoundingBoxAscent || TEXT_MEASURE_REFERENCE_PX * 0.7) +
    (metrics.actualBoundingBoxDescent || TEXT_MEASURE_REFERENCE_PX * 0.2)
  if (!(width > 0) || !(height > 0)) return null

  const physicalPanelName = FEFCO_0201_PANEL_SEMANTICS[el.panel]
  const zone = panels.find((p) => p.panelName === physicalPanelName)?.printZones[0]
  if (!zone) return null

  const minDim = Math.min(zone.boundingBox.w, zone.boundingBox.h)
  const fraction =
    DEFAULT_SQUARE_BUCKETS[el.size as keyof typeof DEFAULT_SQUARE_BUCKETS] ??
    DEFAULT_SQUARE_BUCKETS.medium
  const targetLongEdge = minDim * fraction
  const aspect = width / height

  return aspect >= 1
    ? { w: targetLongEdge, h: targetLongEdge / aspect }
    : { w: targetLongEdge * aspect, h: targetLongEdge }
}

export type ResolveDesignResult = {
  resolvedLayout: ResolvedLayout
  /** panelName -> chosen background color, applied identically to every
   *  main panel - a panel-level style, not a positioned element, so it
   *  doesn't go through the CompositionPlan/resolveLayout at all. */
  backgroundColors: Record<string, string>
}

// Background color is a panel-level style, not a positioned element, so it
// never goes through the CompositionPlan/resolveLayout - shared by both
// the rule-based default and the AI composer path, since a chosen brand
// color applies identically either way.
export function computeBackgroundColors(
  elements: SelectedElement[]
): Record<string, string> {
  const color = elements.find((el) => el.type === "color")?.value ?? null
  const backgroundColors: Record<string, string> = {}
  if (color) {
    for (const physicalPanelName of Object.values(FEFCO_0201_PANEL_SEMANTICS)) {
      if (physicalPanelName) backgroundColors[physicalPanelName] = color
    }
  }
  return backgroundColors
}

export function applyDesign(
  panels: PanelGeometry[],
  elements: SelectedElement[],
  imageNaturalSizes: Record<string, Dimensions> = {}
): ResolveDesignResult {
  const plan = buildCompositionPlan(elements)

  const resolvedLayout = resolveLayout(plan, panels, {
    panelSemantics: FEFCO_0201_PANEL_SEMANTICS,
    computeNaturalSize: (el) =>
      computeAspectPreservingSize(el, panels, imageNaturalSizes) ??
      computeTextAspectSize(el, panels),
  })

  return { resolvedLayout, backgroundColors: computeBackgroundColors(elements) }
}
