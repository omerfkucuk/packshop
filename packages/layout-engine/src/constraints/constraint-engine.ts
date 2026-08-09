import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ConstraintReport } from "../domain/constraint"
import type { ResolvedLayout } from "../domain/resolved-layout"
import { RuleRegistry } from "./rule-engine"
import { noElementOverlapRule } from "./rules/no-element-overlap"

// Domain-specific configuration on top of the generic RuleRegistry - which
// rules are active. More rules (minimum-margin, barcode-printable,
// qr-scannable, ...) join this list as they're built; nothing else needs to
// change to pick them up.
function buildDefaultRuleRegistry(): RuleRegistry {
  const registry = new RuleRegistry()
  registry.register(noElementOverlapRule)
  return registry
}

const defaultRegistry = buildDefaultRuleRegistry()

export function runConstraints(
  layout: ResolvedLayout,
  geometry: PanelGeometry[]
): ConstraintReport {
  return defaultRegistry.runAll(layout, geometry)
}
