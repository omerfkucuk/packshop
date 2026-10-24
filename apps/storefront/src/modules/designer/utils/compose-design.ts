import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ThemeId } from "@dtc/ai-composer/domain"
import { composeAiDesign } from "@lib/data/designs"
import type { SelectedElement } from "../types"
import {
  computeBackgroundColors,
  type ResolveDesignResult,
} from "./apply-design"
import type { PackagingProfile } from "./packaging-profiles"

function toComposerElements(elements: SelectedElement[]) {
  const logo = elements.find((el) => el.type === "logo")
  const slogan = elements.find((el) => el.type === "text")
  const font = elements.find((el) => el.type === "font")?.value ?? null

  const inputs: { elementId: string; elementType: "logo" | "text"; content: Record<string, unknown> }[] = []
  if (logo) inputs.push({ elementId: "logo", elementType: "logo", content: { url: logo.value } })
  if (slogan) inputs.push({ elementId: "text", elementType: "text", content: { text: slogan.value, font } })
  return inputs
}

export type GenerateAiDesignResult = ResolveDesignResult & {
  /** Set when the backend's constraint engine couldn't fully clear every
   *  issue within its retry budget (e.g. two elements still overlap) - the
   *  layout is still shown (soft-fail), but the customer sees a heads-up. */
  warningMessage?: string
}

export async function generateAiDesign(
  panels: PanelGeometry[],
  profile: PackagingProfile,
  elements: SelectedElement[],
  prompt: string,
  theme: ThemeId | null
): Promise<GenerateAiDesignResult> {
  const { resolvedLayout, constraintReport } = await composeAiDesign({
    prompt,
    locale: "tr",
    boxType: profile.type,
    availablePanels: profile.mainPanels,
    selectedElements: toComposerElements(elements),
    theme: theme ?? undefined,
    panels,
    panelSemantics: profile.panelSemantics,
  })

  return {
    resolvedLayout,
    backgroundColors: computeBackgroundColors(elements, profile),
    warningMessage: constraintReport.valid
      ? undefined
      : "Tasarımda küçük bir yerleşim sorunu olabilir, gözden geçirin.",
  }
}
