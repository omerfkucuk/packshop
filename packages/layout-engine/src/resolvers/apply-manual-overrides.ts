import type { ResolvedLayout } from "../domain/resolved-layout"

export interface ManualOverride {
  x: number
  y: number
  w?: number
  h?: number
}

export type ManualOverrides = Record<string, ManualOverride> // elementId -> override

// A pure, client-safe final step layered on top of an already-resolved
// layout (rule-based default, theme template, or AI) - lets the customer
// drag any element to a new mm position without the CompositionPlan/AI
// pipeline ever seeing it. Deliberately NOT a SemanticPlacement kind: an
// override is a per-render presentation concern (like backgroundColors),
// never re-resolved by any rule/theme/AI layer.
export function applyManualOverrides(
  layout: ResolvedLayout,
  overrides: ManualOverrides
): ResolvedLayout {
  if (Object.keys(overrides).length === 0) return layout

  return {
    ...layout,
    panels: layout.panels.map((panel) => ({
      ...panel,
      elements: panel.elements.map((el) => {
        const override = overrides[el.elementId]
        if (!override) return el

        return {
          ...el,
          position: { x: override.x, y: override.y },
          size:
            override.w !== undefined && override.h !== undefined
              ? { w: override.w, h: override.h }
              : el.size,
        }
      }),
    })),
  }
}
