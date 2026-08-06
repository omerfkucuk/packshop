// Packshop's box/pouch variant titles encode real dimensions as plain text
// in millimeters, e.g. `450x350x250` (no unit, no size code prefix) - there's
// no structured L/W/H field on the variant itself, so this is the only place
// that data currently lives.
const DIMENSION_3D_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i

export type VariantDimensionsMm = {
  length: number
  width: number
  height: number
}

export const parseDimensionsFromVariantTitle = (
  title: string | null | undefined
): VariantDimensionsMm | null => {
  if (!title) return null

  const match = title.match(DIMENSION_3D_PATTERN)
  if (!match) return null

  const [, length, width, height] = match

  return {
    length: parseFloat(length.replace(",", ".")),
    width: parseFloat(width.replace(",", ".")),
    height: parseFloat(height.replace(",", ".")),
  }
}
