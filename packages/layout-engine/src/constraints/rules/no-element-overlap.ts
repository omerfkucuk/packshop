import type { ConstraintRule, ConstraintViolation } from "../../domain/constraint"
import type { ResolvedElement } from "../../domain/resolved-layout"

// "shape"/"pattern" are the background tier (z-index 0/5 in
// layout-resolver.ts's DEFAULT_Z_INDEX) - they're expected to sit under
// everything else on their panel, so overlapping them is by design, not a
// violation. Only foreground content (logo/text/qr/barcode/image/icon/...)
// is checked against other foreground content.
const isBackgroundTier = (el: ResolvedElement) =>
  el.elementType === "shape" || el.elementType === "pattern"

const overlaps = (a: ResolvedElement, b: ResolvedElement): boolean =>
  a.position.x < b.position.x + b.size.w &&
  a.position.x + a.size.w > b.position.x &&
  a.position.y < b.position.y + b.size.h &&
  a.position.y + a.size.h > b.position.y

// Pairwise AABB intersection test between all foreground elements on the
// same panel - the one thing an AI-produced CompositionPlan has no other
// guardrail against, since resolveLayout() places every element
// independently of its siblings.
export const noElementOverlapRule: ConstraintRule = {
  id: "no-element-overlap",
  severity: "error",
  check(panelElements) {
    const foreground = panelElements.filter((el) => !isBackgroundTier(el))
    const violations: ConstraintViolation[] = []

    for (let i = 0; i < foreground.length; i++) {
      for (let j = i + 1; j < foreground.length; j++) {
        const a = foreground[i]
        const b = foreground[j]
        if (overlaps(a, b)) {
          violations.push({
            elementId: a.elementId,
            ruleId: "no-element-overlap",
            severity: "error",
            message: `"${a.elementId}" overlaps "${b.elementId}" on panel "${a.panelName}"`,
          })
        }
      }
    }

    return violations
  },
}
