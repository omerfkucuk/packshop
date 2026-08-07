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
