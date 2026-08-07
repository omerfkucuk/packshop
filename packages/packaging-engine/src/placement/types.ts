import { Dimensions, Point } from "../shared/types"

export type DesignElementType =
  | "logo"
  | "text"
  | "qr"
  | "barcode"
  | "image"
  | "icon"
  | "shape"
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

// A 9-point anchor grid within a zone, for callers (like a layout engine
// resolving semantic AI decisions) that need more than "centered" -
// see anchorFit in strategies.ts.
export type AnchorPoint =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
