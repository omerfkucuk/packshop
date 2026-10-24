import type { PanelSemanticsMap, SemanticPanelName } from "@dtc/layout-engine"
import { COURIER_BAG_PANEL_NAMES } from "@dtc/packaging-engine/pouch-styles"
import type { GeometryType } from "@lib/util/product"

// How the designer talks about one packaging type's dieline: which physical
// panel each semantic face maps to, which faces the automatic layouts
// (rule-based default, themes, AI) fill, and the Turkish face names shown
// in the UI. Shared by apply-design.ts, apply-theme.ts and
// compose-design.ts so every layout path sees the same mapping.
export type PackagingProfile = {
  type: GeometryType
  panelSemantics: PanelSemanticsMap
  mainPanels: SemanticPanelName[]
  displayNames: Record<string, string>
}

export const PACKAGING_PROFILES: Record<GeometryType, PackagingProfile> = {
  "fefco-0201": {
    type: "fefco-0201",
    panelSemantics: {
      front: "Panel-L1",
      right: "Panel-W1",
      back: "Panel-L2",
      left: "Panel-W2",
    },
    mainPanels: ["front", "right", "back", "left"],
    displayNames: {
      "Panel-L1": "Ön",
      "Panel-W1": "Sağ",
      "Panel-L2": "Arka",
      "Panel-W2": "Sol",
    },
  },
  // The flap maps to "top" so it gets the background color and can take
  // dragged elements, but it's left out of mainPanels: at a few cm tall it's
  // too small for the automatic layouts to fill well.
  "courier-bag": {
    type: "courier-bag",
    panelSemantics: {
      front: COURIER_BAG_PANEL_NAMES.front,
      back: COURIER_BAG_PANEL_NAMES.back,
      top: COURIER_BAG_PANEL_NAMES.flap,
    },
    mainPanels: ["front", "back"],
    displayNames: {
      [COURIER_BAG_PANEL_NAMES.front]: "Ön",
      [COURIER_BAG_PANEL_NAMES.back]: "Arka",
      [COURIER_BAG_PANEL_NAMES.flap]: "Kapak",
    },
  },
}
