import { resolveSize } from "../size-resolver"

const zoneSize = { w: 400, h: 200 } // min dimension = 200

describe("resolveSize", () => {
  it("returns the known natural size when one is provided, ignoring the hint", () => {
    const result = resolveSize("small", zoneSize, undefined, { w: 123, h: 45 })
    expect(result).toEqual({ w: 123, h: 45 })
  })

  it.each([
    ["small", 0.25],
    ["medium", 0.4],
    ["large", 0.6],
  ] as const)("sizes %s as a fraction of the zone's smaller dimension", (hint, fraction) => {
    const result = resolveSize(hint, zoneSize)
    expect(result).toEqual({ w: 200 * fraction, h: 200 * fraction })
  })

  it("defaults to medium when no hint is given", () => {
    expect(resolveSize(undefined, zoneSize)).toEqual(resolveSize("medium", zoneSize))
  })

  it("full-width locks width to the zone's width without also filling height", () => {
    const result = resolveSize("full-width", zoneSize)
    expect(result.w).toBe(zoneSize.w)
    expect(result.h).toBeLessThan(zoneSize.h)
  })

  it("full-height locks height to the zone's height without also filling width", () => {
    const result = resolveSize("full-height", zoneSize)
    expect(result.h).toBe(zoneSize.h)
    expect(result.w).toBeLessThan(zoneSize.w)
  })

  it("respects per-box-type size bucket overrides", () => {
    const result = resolveSize("large", zoneSize, { large: 0.9 })
    expect(result).toEqual({ w: 180, h: 180 })
  })
})
