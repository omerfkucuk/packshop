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

// Courier bag (kargo poşeti) sizes are written the way the trade writes
// them, in centimeters: `24x30+5` = width 24, height 30, flap 5. Matches the
// variant title too, since it starts with the Ölçü option's value.
const BAG_DIMENSION_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)/i

export type BagDimensionsMm = {
  width: number
  height: number
  flapHeight: number
}

export const parseBagDimensionsFromVariantTitle = (
  title: string | null | undefined
): BagDimensionsMm | null => {
  if (!title) return null

  const match = title.match(BAG_DIMENSION_PATTERN)
  if (!match) return null

  const [width, height, flapHeight] = match
    .slice(1)
    .map((cm) => parseFloat(cm.replace(",", ".")) * 10)

  return { width, height, flapHeight }
}
