import { Dimensions, Point, PrintZone } from "../shared/types"
import { AnchorPoint } from "./types"

export type PlacementResult = {
  position: Point
  size: Dimensions
}

export type PlacementStrategy = (
  zone: PrintZone,
  naturalSize: Dimensions
) => PlacementResult

// The zone's own axis-aligned origin, derived from its boundary polygon -
// strategies size/position against `zone.boundingBox`, but still need this
// to know where that box actually sits.
const zoneOrigin = (zone: PrintZone): Point => ({
  x: Math.min(...zone.boundary.map((p) => p.x)),
  y: Math.min(...zone.boundary.map((p) => p.y)),
})

const center = (zone: PrintZone, size: Dimensions): Point => {
  const origin = zoneOrigin(zone)
  return {
    x: origin.x + (zone.boundingBox.w - size.w) / 2,
    y: origin.y + (zone.boundingBox.h - size.h) / 2,
  }
}

// Scales down (never up) to fit entirely within the zone, preserving aspect
// ratio, and centers it. The default strategy for most elements.
export const fitCenter: PlacementStrategy = (zone, naturalSize) => {
  const scale = Math.min(
    zone.boundingBox.w / naturalSize.w,
    zone.boundingBox.h / naturalSize.h,
    1
  )
  const size: Dimensions = { w: naturalSize.w * scale, h: naturalSize.h * scale }
  return { position: center(zone, size), size }
}

// Stretches to exactly fill the zone's bounding box, ignoring aspect ratio.
export const fitStretch: PlacementStrategy = (zone) => ({
  position: zoneOrigin(zone),
  size: { w: zone.boundingBox.w, h: zone.boundingBox.h },
})

// Scales up or down so the element fully covers the zone (aspect ratio
// preserved, overflow expected) and centers it - the caller is responsible
// for clipping to the zone boundary when rendering/exporting.
export const cropToFit: PlacementStrategy = (zone, naturalSize) => {
  const scale = Math.max(
    zone.boundingBox.w / naturalSize.w,
    zone.boundingBox.h / naturalSize.h
  )
  const size: Dimensions = { w: naturalSize.w * scale, h: naturalSize.h * scale }
  return { position: center(zone, size), size }
}

type Vertical = "top" | "center" | "bottom"
type Horizontal = "left" | "center" | "right"

const ANCHOR_MAP: Record<AnchorPoint, [Vertical, Horizontal]> = {
  "top-left": ["top", "left"],
  "top-center": ["top", "center"],
  "top-right": ["top", "right"],
  "center-left": ["center", "left"],
  center: ["center", "center"],
  "center-right": ["center", "right"],
  "bottom-left": ["bottom", "left"],
  "bottom-center": ["bottom", "center"],
  "bottom-right": ["bottom", "right"],
}

// Fits (contain, never upscale) into a 9-point anchor grid within the zone,
// instead of always centering. Coordinates are Y-up (matches every other
// point in this package), so "top" means the larger Y, not the smaller one.
export const anchorFit = (anchor: AnchorPoint): PlacementStrategy => {
  return (zone, naturalSize) => {
    const [vertical, horizontal] = ANCHOR_MAP[anchor]
    const origin = zoneOrigin(zone)
    const scale = Math.min(
      zone.boundingBox.w / naturalSize.w,
      zone.boundingBox.h / naturalSize.h,
      1
    )
    const size: Dimensions = {
      w: naturalSize.w * scale,
      h: naturalSize.h * scale,
    }

    const x =
      horizontal === "left"
        ? origin.x
        : horizontal === "right"
        ? origin.x + zone.boundingBox.w - size.w
        : origin.x + (zone.boundingBox.w - size.w) / 2

    const y =
      vertical === "bottom"
        ? origin.y
        : vertical === "top"
        ? origin.y + zone.boundingBox.h - size.h
        : origin.y + (zone.boundingBox.h - size.h) / 2

    return { position: { x, y }, size }
  }
}
