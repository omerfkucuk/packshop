import type { ResolvedLayout } from "../domain/resolved-layout"

export interface ManualOverride {
  x: number
  y: number
  w?: number
  h?: number
  /** Physical panel name (e.g. "Panel-L1") - set when the customer dragged
   *  the element onto a different panel than the one it originally
   *  resolved to. Omitted/unchanged means it stays on its current panel. */
  panelName?: string
}

export type ManualOverrides = Record<string, ManualOverride> // elementId -> override

// A pure, client-safe final step layered on top of an already-resolved
// layout (rule-based default, theme template, or AI) - lets the customer
// drag any element to a new mm position (and, now, a different panel
// entirely) without the CompositionPlan/AI pipeline ever seeing it.
// Deliberately NOT a SemanticPlacement kind: an override is a per-render
// presentation concern (like backgroundColors), never re-resolved by any
// rule/theme/AI layer.
//
// Rebuilds the panel groups from scratch (rather than mapping each
// existing panel's element list in place) because a moved element needs
// to leave its old panel's group and join its new one - including a panel
// that had zero elements before, which resolveLayout() never gives its own
// entry in ResolvedLayout.panels to begin with.
export function applyManualOverrides(
  layout: ResolvedLayout,
  overrides: ManualOverrides
): ResolvedLayout {
  if (Object.keys(overrides).length === 0) return layout

  const byPanel = new Map<string, ResolvedLayout["panels"][number]["elements"]>()

  for (const panel of layout.panels) {
    for (const el of panel.elements) {
      const override = overrides[el.elementId]
      const resolvedEl = override
        ? {
            ...el,
            position: { x: override.x, y: override.y },
            size:
              override.w !== undefined && override.h !== undefined
                ? { w: override.w, h: override.h }
                : el.size,
            panelName: override.panelName ?? el.panelName,
          }
        : el

      const group = byPanel.get(resolvedEl.panelName) ?? []
      group.push(resolvedEl)
      byPanel.set(resolvedEl.panelName, group)
    }
  }

  return {
    ...layout,
    panels: Array.from(byPanel.entries()).map(([panelName, elements]) => ({
      panelName,
      elements,
    })),
  }
}
