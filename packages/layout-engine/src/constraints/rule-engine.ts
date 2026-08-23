import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type {
  ConstraintReport,
  ConstraintRule,
  ConstraintViolation,
} from "../domain/constraint"
import type { ResolvedLayout } from "../domain/resolved-layout"
import { elementsTouchingPanel } from "./panel-elements"

// Generic, reusable execution mechanism - which rules are active and what
// they mean domain-wise lives in constraint-engine.ts, not here.
export class RuleRegistry {
  private rules: ConstraintRule[] = []

  register(rule: ConstraintRule): void {
    this.rules.push(rule)
  }

  runAll(layout: ResolvedLayout, geometry: PanelGeometry[]): ConstraintReport {
    const violations: ConstraintViolation[] = []

    // Iterates the authoritative `geometry` list, not `layout.panels` -
    // the latter only ever contains a panel that resolved at least one
    // PRIMARY element (resolveLayout/applyManualOverrides never create an
    // empty entry for one). A panel that only ever receives a wrap
    // element's SECONDARY touch (its own primary element still lives
    // elsewhere) would otherwise never get checked at all.
    for (const panelGeometry of geometry) {
      const panelElements = elementsTouchingPanel(layout, panelGeometry.panelName)

      for (const rule of this.rules) {
        violations.push(...rule.check(panelElements, layout, panelGeometry))
      }
    }

    return {
      valid: !violations.some((v) => v.severity === "error"),
      violations,
    }
  }
}
