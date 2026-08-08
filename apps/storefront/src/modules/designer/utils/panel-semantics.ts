import type { PanelSemanticsMap, SemanticPanelName } from "@dtc/layout-engine"

// Only FEFCO 0201 exists today, so this is a plain constant rather than a
// registry - see the AI layout engine architecture doc's plugin system
// section for when (not if a second box type shows up) this becomes one.
// Shared by both the rule-based default (apply-design.ts) and the AI
// composer path (compose-design.ts) so a real plugin registry only has to
// replace one thing later, not two.
export const FEFCO_0201_PANEL_SEMANTICS: PanelSemanticsMap = {
  front: "Panel-L1",
  right: "Panel-W1",
  back: "Panel-L2",
  left: "Panel-W2",
}

export const MAIN_PANELS: SemanticPanelName[] = ["front", "right", "back", "left"]
