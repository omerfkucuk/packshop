import type {
  CompositionPlan,
  ConstraintViolation,
  ElementType,
  PanelSemanticsMap,
  SemanticPanelName,
} from "@dtc/layout-engine"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ThemeId } from "./theme"

export interface SelectedElementInput {
  elementId: string
  elementType: ElementType
  content: Record<string, unknown>
}

export interface ComposeInput {
  prompt: string
  locale: string
  boxType: string
  availablePanels: SemanticPanelName[]
  selectedElements: SelectedElementInput[]
  theme?: ThemeId
  /** Present on retries: the previous attempt's plan plus what was wrong
   *  with it (schema validation, layout resolution, or constraint
   *  violations), so a real LlmProvider can fix specifically that instead
   *  of guessing again from scratch. MockLlmProvider ignores this - its
   *  output never fails validation. */
  priorAttempt?: {
    plan: CompositionPlan
    violations: ConstraintViolation[]
  }
}

// The shape a compose request travels over the wire as (storefront ->
// backend route -> composeDesign()): everything ComposeInput needs, minus
// the retry-only priorAttempt, plus the box geometry the caller already
// has on hand. Shared here so the backend route and the storefront's
// server action declare this once instead of hand-duplicating it.
export interface ComposeDesignRequestBody
  extends Omit<ComposeInput, "priorAttempt"> {
  panels: PanelGeometry[]
  panelSemantics: PanelSemanticsMap
}
