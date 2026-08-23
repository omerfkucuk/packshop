import type { Point, Dimensions } from "@dtc/packaging-engine/shared"
import type { ElementType } from "./semantic-placement"

export interface ResolvedElement {
  elementId: string
  elementType: ElementType
  panelName: string // the real, physical panel name (e.g. "Panel-L1")
  position: Point // mm, in the same Y-up space as @dtc/packaging-engine
  size: Dimensions
  rotationDeg?: number
  zIndex: number
  content: Record<string, unknown>
  /** Carried over from SemanticPlacement.sourceElementId when the plan set
   *  it (see semantic-placement.ts's doc comment) - lets a caller that
   *  placed the same selected element on multiple panels (e.g. a slogan
   *  repeated on every main face) trace any one physical placement back to
   *  the single logical selection it came from, e.g. to remove all of them
   *  together regardless of which one the customer interacted with. */
  sourceElementId?: string
  /** Real physical panel name of a second panel this element also visually
   *  touches - set when the customer manually drags/resizes it across a
   *  valid wrap seam (see @dtc/packaging-engine's WrapZone). Only ever
   *  produced by applyManualOverrides in the current iteration; resolveLayout
   *  (the AI/rule-based/theme path) never sets it. */
  secondaryPanelName?: string
}

export interface ResolvedPanelLayout {
  panelName: string
  elements: ResolvedElement[]
}

export interface ResolvedLayout {
  boxType: string
  compositionPlanVersion: string
  panels: ResolvedPanelLayout[]
}
