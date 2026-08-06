// Packshop's box variant titles encode real dimensions as free text, e.g.
// `K105 (45 cm x 35 cm x 25 cm)` - there's no structured L/W/H field on the
// variant itself, so this is the only place that data currently lives.
const DIMENSION_PATTERN =
  /\((\d+(?:[.,]\d+)?)\s*cm\s*x\s*(\d+(?:[.,]\d+)?)\s*cm\s*x\s*(\d+(?:[.,]\d+)?)\s*cm\)/i

export type VariantDimensionsCm = {
  length: number
  width: number
  height: number
}

export const parseDimensionsFromVariantTitle = (
  title: string | null | undefined
): VariantDimensionsCm | null => {
  if (!title) return null

  const match = title.match(DIMENSION_PATTERN)
  if (!match) return null

  const [, length, width, height] = match

  return {
    length: parseFloat(length.replace(",", ".")),
    width: parseFloat(width.replace(",", ".")),
    height: parseFloat(height.replace(",", ".")),
  }
}
