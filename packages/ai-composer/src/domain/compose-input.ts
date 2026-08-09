import type {
  CompositionPlan,
  ConstraintViolation,
  ElementType,
  SemanticPanelName,
} from "@dtc/layout-engine"
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
