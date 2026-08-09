import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type {
  ConstraintReport,
  ConstraintRule,
  ConstraintViolation,
} from "../domain/constraint"
import type { ResolvedLayout } from "../domain/resolved-layout"

// Generic, reusable execution mechanism - which rules are active and what
// they mean domain-wise lives in constraint-engine.ts, not here.
export class RuleRegistry {
  private rules: ConstraintRule[] = []

  register(rule: ConstraintRule): void {
    this.rules.push(rule)
  }

  runAll(layout: ResolvedLayout, geometry: PanelGeometry[]): ConstraintReport {
    const geometryByPanel = new Map(geometry.map((p) => [p.panelName, p]))
    const violations: ConstraintViolation[] = []

    for (const panel of layout.panels) {
      const panelGeometry = geometryByPanel.get(panel.panelName)
      if (!panelGeometry) continue // resolveLayout guarantees this in practice

      for (const rule of this.rules) {
        violations.push(...rule.check(panel.elements, layout, panelGeometry))
      }
    }

    return {
      valid: !violations.some((v) => v.severity === "error"),
      violations,
    }
  }
}
