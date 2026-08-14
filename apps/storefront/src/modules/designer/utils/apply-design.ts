import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import {
  resolveLayout,
  type CompositionPlan,
  type ResolvedLayout,
  type SemanticPlacement,
} from "@dtc/layout-engine"
import type { SelectedElement } from "../types"
import { FEFCO_0201_PANEL_SEMANTICS, MAIN_PANELS } from "./panel-semantics"
import { getLibraryElement } from "./element-library"

// Turns the customer's selected brand elements into a CompositionPlan: the
// same logo (centered) and slogan (below it, in the selected font)
// repeated identically across all 4 main faces. This is the "no real
// AI/text prompt yet" default plan - once AI composition exists, it
// produces plans through the exact same resolveLayout() call.
function buildCompositionPlan(elements: SelectedElement[]): CompositionPlan {
  const logo = elements.find((el) => el.type === "logo")
  const slogan = elements.find((el) => el.type === "text")
  const font = elements.find((el) => el.type === "font")?.value ?? null
  const color = elements.find((el) => el.type === "color")?.value ?? null
  const libraryElements = elements.filter((el) => el.type === "library-element")

  const planElements: SemanticPlacement[] = []

  for (const panel of MAIN_PANELS) {
    const logoId = `logo-${panel}`

    if (logo) {
      planElements.push({
        elementId: logoId,
        elementType: "logo",
        content: { url: logo.value },
        placementKind: "absolute",
        panel,
        anchor: "center",
        size: slogan ? "medium" : "large",
      })
    }

    if (slogan) {
      const base = {
        elementId: `slogan-${panel}`,
        elementType: "text" as const,
        content: { text: slogan.value, font },
        size: "medium" as const,
      }

      planElements.push(
        logo
          ? {
              ...base,
              placementKind: "relative",
              panel,
              relativeTo: logoId,
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

    for (const selected of libraryElements) {
      const entry = getLibraryElement(selected.value)
      if (!entry) continue

      // shape/pattern are the background tier (exempt from the
      // no-element-overlap rule, see constraints/rules/no-element-overlap.ts)
      // so they can sit centered under the logo; icon is foreground and
      // would clash with a centered logo, so it gets a corner instead.
      const isBackgroundTier = entry.category === "shape" || entry.category === "pattern"

      planElements.push({
        elementId: `element-${entry.id}-${panel}`,
        elementType: entry.category,
        content: {
          libraryElementId: entry.id,
          color: entry.recolorable && color ? color : undefined,
        },
        placementKind: "absolute",
        panel,
        anchor: isBackgroundTier ? "center" : "bottom-right",
        // "large" (a square-ish bucket), not "full-width" (a wide-but-short
        // one) - these library symbols have square viewBoxes, and a wide
        // box just letterboxes a square symbol down to its short axis.
        size: isBackgroundTier ? "large" : "small",
      })
    }
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
