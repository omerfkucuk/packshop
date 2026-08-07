import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import {
  resolveLayout,
  type CompositionPlan,
  type PanelSemanticsMap,
  type ResolvedLayout,
  type SemanticPanelName,
  type SemanticPlacement,
} from "@dtc/layout-engine"
import type { SelectedElement } from "../types"

// Only FEFCO 0201 exists today, so this is a plain constant rather than a
// registry - see the AI layout engine architecture doc's plugin system
// section for when (not if a second box type shows up) this becomes one.
const FEFCO_0201_PANEL_SEMANTICS: PanelSemanticsMap = {
  front: "Panel-L1",
  right: "Panel-W1",
  back: "Panel-L2",
  left: "Panel-W2",
}

const MAIN_PANELS: SemanticPanelName[] = ["front", "right", "back", "left"]

// Turns the customer's selected brand elements into a CompositionPlan: the
// same logo (centered) and slogan (below it, in the selected font)
// repeated identically across all 4 main faces. This is the "no real
// AI/text prompt yet" default plan - once AI composition exists, it
// produces plans through the exact same resolveLayout() call.
function buildCompositionPlan(elements: SelectedElement[]): CompositionPlan {
  const logo = elements.find((el) => el.type === "logo")
  const slogan = elements.find((el) => el.type === "text")
  const font = elements.find((el) => el.type === "font")?.value ?? null

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

export function applyDesign(
  panels: PanelGeometry[],
  elements: SelectedElement[]
): ResolveDesignResult {
  const color = elements.find((el) => el.type === "color")?.value ?? null
  const plan = buildCompositionPlan(elements)

  const resolvedLayout = resolveLayout(plan, panels, {
    panelSemantics: FEFCO_0201_PANEL_SEMANTICS,
  })

  const backgroundColors: Record<string, string> = {}
  if (color) {
    for (const physicalPanelName of Object.values(FEFCO_0201_PANEL_SEMANTICS)) {
      if (physicalPanelName) backgroundColors[physicalPanelName] = color
    }
  }

  return { resolvedLayout, backgroundColors }
}
