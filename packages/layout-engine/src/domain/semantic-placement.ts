import type { DesignElementType, AnchorPoint } from "@dtc/packaging-engine/placement"

// Reuses packaging-engine's own element vocabulary and anchor grid rather
// than defining parallel ones - both are meaningful the same way to the
// low-level placement primitives and to this layer.
export type ElementType = DesignElementType
export type { AnchorPoint }

// Deliberately NOT tied to any one box style's real panel names (those
// live in a BoxTypePlugin's panelSemantics map, resolved at layout time).
export type SemanticPanelName = "front" | "back" | "left" | "right" | "top" | "bottom"

export type RelativePosition = "above" | "below" | "left-of" | "right-of" | "inside"

export type SizeHint = "small" | "medium" | "large" | "full-width" | "full-height"

export type SpacingHint = "tight" | "normal" | "loose"

export interface SemanticElementBase {
  elementId: string
  elementType: ElementType
  /** Whatever the element-type plugin needs to render it (image URL, text +
   *  font, QR target, ...). The layout engine never inspects this. */
  content: Record<string, unknown>
  /** Set when this placement reuses one of the customer's selected brand
   *  elements (e.g. repeating a logo across panels needs a fresh elementId
   *  per repeat, but the same source asset) - the elementId from
   *  ComposeInput.selectedElements. An LlmProvider is unreliable at
   *  faithfully copying `content` forward on its own (observed: a real
   *  model round-tripped a logo placement with `content: {}`, silently
   *  dropping the URL), so composeDesign() overwrites `content` from the
   *  authoritative selectedElements list whenever this is set, rather than
   *  trusting whatever the provider echoed back. Omitted for elements the
   *  plan invents itself (e.g. a decorative shape with no source asset). */
  sourceElementId?: string
}

export interface AbsolutePlacement extends SemanticElementBase {
  placementKind: "absolute"
  panel: SemanticPanelName
  anchor: AnchorPoint
  size?: SizeHint
  marginHint?: SpacingHint
}

export interface RelativePlacement extends SemanticElementBase {
  placementKind: "relative"
  panel: SemanticPanelName
  relativeTo: string // another element's elementId
  position: RelativePosition
  gapHint?: SpacingHint
  size?: SizeHint
}

export type SemanticPlacement = AbsolutePlacement | RelativePlacement

export interface CompositionPlan {
  version: "1.0"
  boxType: string
  elements: SemanticPlacement[]
  metadata?: {
    promptUsed?: string
    aiModel?: string
    generatedAt: string
  }
}
