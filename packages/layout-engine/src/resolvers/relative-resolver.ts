import type { Point, Dimensions } from "@dtc/packaging-engine/shared"
import type { RelativePosition, SpacingHint } from "../domain/semantic-placement"

const GAP_MM: Record<SpacingHint, number> = {
  tight: 2,
  normal: 6,
  loose: 14,
}

export interface ResolvedBox {
  position: Point
  size: Dimensions
}

// Positions an element relative to an already-resolved reference box.
// Coordinates are Y-up, matching @dtc/packaging-engine: "above" the
// reference means a larger Y (visually higher), "below" means a smaller Y.
export function resolveRelativePosition(
  position: RelativePosition,
  reference: ResolvedBox,
  size: Dimensions,
  gapHint: SpacingHint = "normal"
): Point {
  const gap = GAP_MM[gapHint]

  switch (position) {
    case "above":
      return {
        x: reference.position.x + (reference.size.w - size.w) / 2,
        y: reference.position.y + reference.size.h + gap,
      }
    case "below":
      return {
        x: reference.position.x + (reference.size.w - size.w) / 2,
        y: reference.position.y - size.h - gap,
      }
    case "left-of":
      return {
        x: reference.position.x - size.w - gap,
        y: reference.position.y + (reference.size.h - size.h) / 2,
      }
    case "right-of":
      return {
        x: reference.position.x + reference.size.w + gap,
        y: reference.position.y + (reference.size.h - size.h) / 2,
      }
    case "inside":
      return {
        x: reference.position.x + (reference.size.w - size.w) / 2,
        y: reference.position.y + (reference.size.h - size.h) / 2,
      }
  }
}
