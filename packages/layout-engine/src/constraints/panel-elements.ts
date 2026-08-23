import type { ResolvedElement, ResolvedLayout } from "../domain/resolved-layout"

// Every element touching a given physical panel - its own (primary)
// elements, plus any OTHER panel's element that wraps onto this one via
// `secondaryPanelName`. A wrap element is stored under exactly one bucket
// in ResolvedLayout.panels (its primary panel, so painting stays a single
// draw) - constraint checking is the one place that needs to see it from
// both sides, since a wrap element's footprint genuinely occupies two
// panels' worth of space.
export function elementsTouchingPanel(
  layout: ResolvedLayout,
  panelName: string
): ResolvedElement[] {
  const own = layout.panels.find((p) => p.panelName === panelName)?.elements ?? []
  const wrappedIn = layout.panels
    .filter((p) => p.panelName !== panelName)
    .flatMap((p) => p.elements)
    .filter((el) => el.secondaryPanelName === panelName)

  return wrappedIn.length > 0 ? [...own, ...wrappedIn] : own
}
