import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import { resolveLayout } from "@dtc/layout-engine"
import {
  composeDesign,
  MockLlmProvider,
  type ThemeId,
} from "@dtc/ai-composer"
import type { SelectedElement } from "../types"
import {
  computeBackgroundColors,
  type ResolveDesignResult,
} from "./apply-design"
import { FEFCO_0201_PANEL_SEMANTICS, MAIN_PANELS } from "./panel-semantics"

// No API key needed yet - MockLlmProvider builds a CompositionPlan from
// the theme's defaults plus a simple keyword scan of the prompt (see
// packages/ai-composer). Swapping in a real provider only touches this
// one line; every caller of generateAiDesign is unaffected.
const provider = new MockLlmProvider()

function toComposerElements(elements: SelectedElement[]) {
  const logo = elements.find((el) => el.type === "logo")
  const slogan = elements.find((el) => el.type === "text")
  const font = elements.find((el) => el.type === "font")?.value ?? null

  const inputs: { elementId: string; elementType: "logo" | "text"; content: Record<string, unknown> }[] = []
  if (logo) inputs.push({ elementId: "logo", elementType: "logo", content: { url: logo.value } })
  if (slogan) inputs.push({ elementId: "text", elementType: "text", content: { text: slogan.value, font } })
  return inputs
}

export async function generateAiDesign(
  panels: PanelGeometry[],
  elements: SelectedElement[],
  prompt: string,
  theme: ThemeId | null
): Promise<ResolveDesignResult> {
  const plan = await composeDesign(
    {
      prompt,
      locale: "tr",
      boxType: "fefco-0201",
      availablePanels: MAIN_PANELS,
      selectedElements: toComposerElements(elements),
      theme: theme ?? undefined,
    },
    provider
  )

  const resolvedLayout = resolveLayout(plan, panels, {
    panelSemantics: FEFCO_0201_PANEL_SEMANTICS,
  })

  return { resolvedLayout, backgroundColors: computeBackgroundColors(elements) }
}
