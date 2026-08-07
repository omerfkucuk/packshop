// A brand asset (logo, color, or font) the customer has picked to use for
// AI generation. Deliberately separate from @dtc/packaging-engine's
// DesignElement - that type is for placing a finished asset into a print
// zone; this one is just "what's currently selected as AI context," and
// doesn't need real dimensions or content payloads yet.
export type SelectedElementType = "logo" | "color" | "font" | "text" | "social"

export type SelectedElement = {
  id: string
  type: SelectedElementType
  label: string
  value: string
}
