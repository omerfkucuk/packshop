import type {
  AnchorPoint,
  CompositionPlan,
  SemanticPlacement,
} from "@dtc/layout-engine"
import type { ComposeInput } from "../domain/compose-input"
import { THEMES, type ThemeId } from "../domain/theme"
import type { LlmProvider } from "./llm-provider"

// Longest/most specific patterns first, since e.g. "sağ üst" must win over
// the bare "üst"/"sağ" fallbacks.
const ANCHOR_KEYWORDS: [RegExp, AnchorPoint][] = [
  [/sol\s*üst/i, "top-left"],
  [/sağ\s*üst/i, "top-right"],
  [/sol\s*alt/i, "bottom-left"],
  [/sağ\s*alt/i, "bottom-right"],
  [/orta|merkez/i, "center"],
  [/üst/i, "top-center"],
  [/alt/i, "bottom-center"],
  [/\bsol\b/i, "center-left"],
  [/\bsağ\b/i, "center-right"],
]

const extractAnchorFromPrompt = (prompt: string): AnchorPoint | null => {
  for (const [pattern, anchor] of ANCHOR_KEYWORDS) {
    if (pattern.test(prompt)) return anchor
  }
  return null
}

const DEFAULT_THEME: ThemeId = "sade"

// No real model call - builds a CompositionPlan straight from the theme's
// defaults plus a simple anchor keyword scan of the prompt. Exists so the
// full pipeline (theme -> composer -> resolveLayout) is wireable and
// testable before a real LlmProvider (with a real API key) replaces it -
// every other layer is unaffected by that swap.
export class MockLlmProvider implements LlmProvider {
  async generateComposition(input: ComposeInput): Promise<CompositionPlan> {
    const theme = THEMES[input.theme ?? DEFAULT_THEME]
    const anchor = extractAnchorFromPrompt(input.prompt) ?? theme.defaults.logoAnchor

    const logo = input.selectedElements.find((el) => el.elementType === "logo")
    const slogan = input.selectedElements.find((el) => el.elementType === "text")

    const sloganPanels = theme.defaults.sloganOnEveryPanel
      ? input.availablePanels
      : input.availablePanels.slice(0, 1)

    const elements: SemanticPlacement[] = []

    for (const panel of input.availablePanels) {
      const logoId = `logo-${panel}`

      if (logo) {
        elements.push({
          elementId: logoId,
          elementType: "logo",
          content: logo.content,
          sourceElementId: logo.elementId,
          placementKind: "absolute",
          panel,
          anchor,
          size: theme.defaults.logoSize,
        })
      }

      if (slogan && sloganPanels.includes(panel)) {
        const base = {
          elementId: `slogan-${panel}`,
          elementType: "text" as const,
          content: slogan.content,
          sourceElementId: slogan.elementId,
          size: "medium" as const,
        }

        elements.push(
          logo
            ? {
                ...base,
                placementKind: "relative",
                panel,
                relativeTo: logoId,
                position: "below",
                gapHint: theme.defaults.gapHint,
              }
            : {
                ...base,
                placementKind: "absolute",
                panel,
                anchor,
              }
        )
      }
    }

    return {
      version: "1.0",
      boxType: input.boxType,
      elements,
      metadata: {
        promptUsed: input.prompt,
        aiModel: "mock-rule-based-v1",
        generatedAt: new Date().toISOString(),
      },
    }
  }
}
