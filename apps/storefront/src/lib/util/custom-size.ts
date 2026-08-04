import { HttpTypes } from "@medusajs/types"

export type CustomSizeRange = {
  min: number
  max: number
}

export type CustomSizeRanges = {
  width: CustomSizeRange
  height: CustomSizeRange
  depth: CustomSizeRange
}

const DEFAULT_RANGE: CustomSizeRange = { min: 5, max: 100 }

const readNumber = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
  fallback: number
): number => {
  const raw = metadata?.[key]
  const parsed = typeof raw === "string" ? parseFloat(raw) : (raw as number)
  return typeof parsed === "number" && !isNaN(parsed) ? parsed : fallback
}

// Reads admin-configured custom size bounds from product metadata
// (custom_size_min_width, custom_size_max_width, ...), falling back to a
// generic packaging-sized range where a product hasn't been configured yet.
export const getCustomSizeRanges = (
  product: HttpTypes.StoreProduct
): CustomSizeRanges => {
  const metadata = product.metadata

  return {
    width: {
      min: readNumber(metadata, "custom_size_min_width", DEFAULT_RANGE.min),
      max: readNumber(metadata, "custom_size_max_width", DEFAULT_RANGE.max),
    },
    height: {
      min: readNumber(metadata, "custom_size_min_height", DEFAULT_RANGE.min),
      max: readNumber(metadata, "custom_size_max_height", DEFAULT_RANGE.max),
    },
    depth: {
      min: readNumber(metadata, "custom_size_min_depth", DEFAULT_RANGE.min),
      max: readNumber(metadata, "custom_size_max_depth", DEFAULT_RANGE.max),
    },
  }
}
