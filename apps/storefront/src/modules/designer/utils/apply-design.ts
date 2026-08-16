import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import {
  resolveLayout,
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

  return { version: "1.0", boxType: "fefco-0201", elements: planElements }
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
  elements: SelectedElement[]
): ResolveDesignResult {
  const plan = buildCompositionPlan(elements)

  const resolvedLayout = resolveLayout(plan, panels, {
    panelSemantics: FEFCO_0201_PANEL_SEMANTICS,
  })

  return { resolvedLayout, backgroundColors: computeBackgroundColors(elements) }
}
