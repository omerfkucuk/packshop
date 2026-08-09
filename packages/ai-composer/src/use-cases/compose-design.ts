import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import {
  CompositionPlanSchema,
  resolveLayout,
  runConstraints,
  type CompositionPlan,
  type ConstraintReport,
  type ConstraintViolation,
  type PanelSemanticsMap,
  type ResolvedLayout,
} from "@dtc/layout-engine"
import type { ComposeInput } from "../domain/compose-input"
import type { LlmProvider } from "../providers/llm-provider"

const MAX_ATTEMPTS = 3

export interface ComposeDesignResult {
  compositionPlan: CompositionPlan
  resolvedLayout: ResolvedLayout
  constraintReport: ConstraintReport
}

const schemaViolation = (detail: string): ConstraintViolation => ({
  elementId: "(plan)",
  ruleId: "schema-validation",
  severity: "error",
  message: `The plan did not match the required shape: ${detail}`,
})

const resolutionViolation = (detail: string): ConstraintViolation => ({
  elementId: "(plan)",
  ruleId: "layout-resolution",
  severity: "error",
  message: `The plan could not be resolved against the box geometry: ${detail}`,
})

const unknownSourceViolation = (elementId: string, sourceElementId: string): ConstraintViolation => ({
  elementId,
  ruleId: "unknown-source-element",
  severity: "error",
  message: `sourceElementId "${sourceElementId}" does not match any selected element`,
})

// A real LlmProvider is unreliable at faithfully echoing an element's
// `content` back (observed: a real model round-tripped a logo placement
// with `content: {}`, silently dropping the URL) - so `content` for any
// placement that reuses a selected brand element (`sourceElementId` set)
// is always overwritten from the authoritative selectedElements list, never
// trusted from the provider's own output. See semantic-placement.ts's
// `sourceElementId` doc comment.
function rehydrateContent(
  plan: CompositionPlan,
  selectedElements: ComposeInput["selectedElements"]
): { plan: CompositionPlan; violations: ConstraintViolation[] } {
  const byId = new Map(selectedElements.map((el) => [el.elementId, el]))
  const violations: ConstraintViolation[] = []

  const elements = plan.elements.map((el) => {
    if (!el.sourceElementId) return el
    const source = byId.get(el.sourceElementId)
    if (!source) {
      violations.push(unknownSourceViolation(el.elementId, el.sourceElementId))
      return el
    }
    return { ...el, content: source.content }
  })

  return { plan: { ...plan, elements }, violations }
}

// The full AI Service pipeline (architecture doc §7): call the provider,
// validate its output against the CompositionPlan schema (never trust raw
// LLM JSON), resolve it against real geometry, run it through the
// constraint engine, and - if anything's wrong - retry with the specific
// problems attached so the model fixes exactly that instead of guessing
// again from scratch. Bounded at MAX_ATTEMPTS; if still invalid by then,
// the last attempt is returned anyway with its violations visible, rather
// than blocking the customer entirely (soft-fail, per the architecture
// doc's repair-loop section).
export async function composeDesign(
  input: ComposeInput,
  provider: LlmProvider,
  geometry: PanelGeometry[],
  panelSemantics: PanelSemanticsMap
): Promise<ComposeDesignResult> {
  let priorAttempt: ComposeInput["priorAttempt"]
  let lastResult: ComposeDesignResult | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const rawPlan = await provider.generateComposition({
      ...input,
      priorAttempt,
    })

    const parsed = CompositionPlanSchema.safeParse(rawPlan)
    if (!parsed.success) {
      priorAttempt = { plan: rawPlan, violations: [schemaViolation(parsed.error.message)] }
      continue
    }

    // zod's inferred type structurally matches CompositionPlan but isn't
    // nominally the same type - safe to assert, the shapes are kept in
    // lockstep by composition-plan.schema.ts's own comment.
    const rehydrated = rehydrateContent(parsed.data as CompositionPlan, input.selectedElements)
    if (rehydrated.violations.length > 0) {
      priorAttempt = { plan: rehydrated.plan, violations: rehydrated.violations }
      continue
    }
    const compositionPlan = rehydrated.plan

    let resolvedLayout: ResolvedLayout
    try {
      resolvedLayout = resolveLayout(compositionPlan, geometry, { panelSemantics })
    } catch (err) {
      priorAttempt = {
        plan: compositionPlan,
        violations: [resolutionViolation(err instanceof Error ? err.message : String(err))],
      }
      continue
    }

    const constraintReport = runConstraints(resolvedLayout, geometry)
    lastResult = { compositionPlan, resolvedLayout, constraintReport }

    if (constraintReport.valid) {
      return lastResult
    }

    priorAttempt = { plan: compositionPlan, violations: constraintReport.violations }
  }

  if (lastResult) return lastResult

  // Every attempt failed schema validation or layout resolution outright
  // (never even produced a scoreable ResolvedLayout) - nothing usable to
  // soft-fail with.
  throw new Error(
    `Failed to produce a valid composition after ${MAX_ATTEMPTS} attempts`
  )
}
