import { Dimensions, Point } from "../shared/types"

export type DesignElementType =
  | "logo"
  | "text"
  | "pattern"
  | "reference-image"
  | "ai-generated"

// Deliberately loose - the actual asset/generation pipeline for each element
// type doesn't exist yet, so `content` just carries whatever that element
// needs (an image URL, a text string + font, a generation prompt, ...).
export interface DesignElement {
  id: string
  type: DesignElementType
  naturalSize: Dimensions
  content?: Record<string, unknown>
}

export interface PositionedDesign {
  elementId: string
  panelName: string
  zoneId: string
  position: Point
  size: Dimensions
  rotationDeg?: number
}
