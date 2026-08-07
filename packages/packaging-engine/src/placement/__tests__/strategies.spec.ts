import { anchorFit } from "../strategies"
import { PrintZone } from "../../shared/types"

const zone: PrintZone = {
  id: "zone-1",
  panelName: "Panel-L1",
  boundary: [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 110, y: 70 },
    { x: 10, y: 70 },
  ],
  boundingBox: { w: 100, h: 50 },
}

describe("anchorFit", () => {
  it("places a top-left anchored element at the zone's own top-left corner", () => {
    const { position, size } = anchorFit("top-left")(zone, { w: 20, h: 10 })
    expect(size).toEqual({ w: 20, h: 10 })
    // Y-up: "top" is the larger Y, i.e. origin.y + boundingBox.h - size.h.
    expect(position).toEqual({ x: 10, y: 60 })
  })

  it("places a bottom-right anchored element at the zone's own bottom-right corner", () => {
    const { position } = anchorFit("bottom-right")(zone, { w: 20, h: 10 })
    expect(position).toEqual({ x: 90, y: 20 })
  })

  it("center anchor matches fitCenter's centering math", () => {
    const { position, size } = anchorFit("center")(zone, { w: 20, h: 10 })
    expect(size).toEqual({ w: 20, h: 10 })
    expect(position).toEqual({ x: 50, y: 40 })
  })

  it("never upscales beyond the zone, same as the other strategies", () => {
    const { size } = anchorFit("top-center")(zone, { w: 1000, h: 1000 })
    expect(size.w).toBeLessThanOrEqual(zone.boundingBox.w)
    expect(size.h).toBeLessThanOrEqual(zone.boundingBox.h)
  })

  it("keeps the resulting box fully within the zone for every anchor", () => {
    const anchors = [
      "top-left", "top-center", "top-right",
      "center-left", "center", "center-right",
      "bottom-left", "bottom-center", "bottom-right",
    ] as const

    for (const anchor of anchors) {
      const { position, size } = anchorFit(anchor)(zone, { w: 30, h: 15 })
      expect(position.x).toBeGreaterThanOrEqual(10)
      expect(position.x + size.w).toBeLessThanOrEqual(110)
      expect(position.y).toBeGreaterThanOrEqual(20)
      expect(position.y + size.h).toBeLessThanOrEqual(70)
    }
  })
})
