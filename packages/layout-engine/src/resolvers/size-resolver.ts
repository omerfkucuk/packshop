import type { Dimensions } from "@dtc/packaging-engine/shared"
import type { SizeBucketOverrides } from "../domain/panel-semantics"
import type { SizeHint } from "../domain/semantic-placement"

// Fraction of the zone's smaller dimension a "small"/"medium"/"large"
// element should target - a starting point tuned per box type via
// SizeBucketOverrides, not a hard rule.
const DEFAULT_SQUARE_BUCKETS: Record<"small" | "medium" | "large", number> = {
  small: 0.25,
  medium: 0.4,
  large: 0.6,
}

// full-width/full-height lock one axis to the zone's own size and give the
// other axis a sane default (NOT also 100% - that would just fill the
// whole zone and make "full-width" indistinguishable from "large").
const CROSS_AXIS_FRACTION = DEFAULT_SQUARE_BUCKETS.medium

export function resolveSize(
  sizeHint: SizeHint | undefined,
  zoneSize: Dimensions,
  overrides?: SizeBucketOverrides,
  knownNaturalSize?: Dimensions | null
): Dimensions {
  // A real, known size (e.g. an uploaded logo's actual pixel dimensions)
  // always wins over a generic hint.
  if (knownNaturalSize) {
    return knownNaturalSize
  }

  const hint = sizeHint ?? "medium"
  const minDim = Math.min(zoneSize.w, zoneSize.h)

  if (hint === "full-width") {
    return { w: zoneSize.w, h: minDim * (overrides?.medium ?? CROSS_AXIS_FRACTION) }
  }
  if (hint === "full-height") {
    return { w: minDim * (overrides?.medium ?? CROSS_AXIS_FRACTION), h: zoneSize.h }
  }

  const fraction = overrides?.[hint] ?? DEFAULT_SQUARE_BUCKETS[hint]
  return { w: minDim * fraction, h: minDim * fraction }
}
