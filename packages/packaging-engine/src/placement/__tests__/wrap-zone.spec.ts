import { generateFefco0201 } from "../../box-styles/fefco-0201"
import { deriveWrapZones } from "../wrap-zone"

describe("deriveWrapZones", () => {
  const length = 300
  const width = 200
  const height = 250
  const panels = generateFefco0201({ length, width, height, thickness: 3 })

  it("finds exactly the 3 adjacent main-panel pairs, in flat order", () => {
    const wrapZones = deriveWrapZones(panels)

    expect(wrapZones.map((z) => z.panels)).toEqual([
      ["Panel-L1", "Panel-W1"],
      ["Panel-W1", "Panel-L2"],
      ["Panel-L2", "Panel-W2"],
    ])
  })

  it("never pairs the glue tab (no print zone) with anything", () => {
    const wrapZones = deriveWrapZones(panels)

    expect(wrapZones.some((z) => z.panels.includes("GlueTab"))).toBe(false)
  })

  it("never pairs front and left - that seam is the hidden glue joint, not a crease", () => {
    const wrapZones = deriveWrapZones(panels)

    expect(wrapZones.some((z) => z.panels.includes("Panel-L1") && z.panels.includes("Panel-W2"))).toBe(
      false
    )
  })

  it("bridges the safety-margin gap: the merged bounding box spans both panels' full print width", () => {
    const wrapZones = deriveWrapZones(panels)
    const l1w1 = wrapZones.find((z) => z.panels[0] === "Panel-L1" && z.panels[1] === "Panel-W1")

    expect(l1w1).toBeDefined()
    // The internal seam's 10mm gap (5mm safety inset on each side of it)
    // is bridged, but the two OUTER edges (front's left edge, right's
    // right edge) keep their normal 5mm print-safe margin - same as any
    // single-panel zone's outer edges would.
    expect(l1w1!.boundingBox.w).toBeCloseTo(length + width - 10, 5)
    expect(l1w1!.boundingBox.h).toBeCloseTo(height - 10, 5)
  })

  it("keeps the outer edges' safety insets, but not at the shared seam", () => {
    const wrapZones = deriveWrapZones(panels)
    const l1w1 = wrapZones.find((z) => z.panels[0] === "Panel-L1" && z.panels[1] === "Panel-W1")!

    expect(l1w1.safeInsets).toEqual({ left: 5, right: 5, top: 5, bottom: 5 })
  })

  it("returns nothing for empty or single-panel input", () => {
    expect(deriveWrapZones([])).toEqual([])
    expect(deriveWrapZones([panels[0]])).toEqual([])
  })
})
