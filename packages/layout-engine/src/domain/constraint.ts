import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import type { ResolvedElement, ResolvedLayout } from "./resolved-layout"

export interface ConstraintViolation {
  elementId: string
  ruleId: string
  severity: "error" | "warning"
  // Plain string, not an i18n messageKey - only ever consumed by the AI
  // retry loop (as re-prompt context) and dev-facing debugging today. Move
  // to a message catalog if/when a violation needs to render in the
  // customer-facing UI.
  message: string
}

export interface ConstraintReport {
  valid: boolean // no `error`-severity violations
  violations: ConstraintViolation[]
}

export interface ConstraintRule {
  id: string
  severity: "error" | "warning"
  // Runs once per panel (not per element) - most rules need to compare an
  // element against its siblings, not just itself, so per-element checking
  // would just make every rule re-derive its own panel's element list.
  check(
    panelElements: ResolvedElement[],
    layout: ResolvedLayout,
    geometry: PanelGeometry
  ): ConstraintViolation[]
}
