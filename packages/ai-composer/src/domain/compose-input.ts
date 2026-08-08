import type { ElementType, SemanticPanelName } from "@dtc/layout-engine"
import type { ThemeId } from "./theme"

export interface SelectedElementInput {
  elementId: string
  elementType: ElementType
  content: Record<string, unknown>
}

export interface ComposeInput {
  prompt: string
  locale: string
  boxType: string
  availablePanels: SemanticPanelName[]
  selectedElements: SelectedElementInput[]
  theme?: ThemeId
}
