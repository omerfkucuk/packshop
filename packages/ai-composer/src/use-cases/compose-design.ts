import type { CompositionPlan } from "@dtc/layout-engine"
import type { ComposeInput } from "../domain/compose-input"
import type { LlmProvider } from "../providers/llm-provider"

// Thin today (schema validation + the constraint-repair retry loop from
// the architecture doc's AI Service section land here once a real
// LlmProvider exists) - kept as its own seam so callers never depend on a
// concrete provider directly.
export async function composeDesign(
  input: ComposeInput,
  provider: LlmProvider
): Promise<CompositionPlan> {
  return provider.generateComposition(input)
}
