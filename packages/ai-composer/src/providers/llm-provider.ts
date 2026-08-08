import type { CompositionPlan } from "@dtc/layout-engine"
import type { ComposeInput } from "../domain/compose-input"

// Real providers (AnthropicProvider, OpenAiProvider, ...) constrain the
// vendor's structured-output/tool-use mode to the CompositionPlan JSON
// Schema and never free-text-parse a response - see the architecture doc's
// AI Service section. Swapping MockLlmProvider for one is the only change
// needed anywhere this interface is used.
export interface LlmProvider {
  generateComposition(input: ComposeInput): Promise<CompositionPlan>
}
