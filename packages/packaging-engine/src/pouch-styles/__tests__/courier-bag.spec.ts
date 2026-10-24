import { deriveWrapZones } from "../../placement/wrap-zone"
import { generateCourierBag } from "../courier-bag"

// 24x30+5 - the smallest kargo poşeti size, in mm.
const params = { width: 240, height: 300, flapHeight: 50 }

describe("generateCourierBag", () => {
  it("returns front, back and flap", () => {
    expect(generateCourierBag(params).map((p) => p.panelName)).toEqual([
      "Bag-Front",
      "Bag-Back",
      "Bag-Flap",
    ])
  })

  it("keeps the front's print zone clear of the strip the closed flap covers", () => {
    const [front] = generateCourierBag(params)
    const zone = front.printZones[0]

    // 8mm side/bottom seals, 5mm at the side fold, flap (50) + 5mm at the top.
    expect(zone.boundingBox).toEqual({ w: 240 - 8 - 5, h: 300 - 8 - 55 })
    expect(Math.max(...zone.boundary.map((p) => p.y))).toBe(300 - 55)
  })

  it("makes the printable back side width x (height + flap)", () => {
    const [, back, flap] = generateCourierBag(params)
    const ys = [...back.cutLines, ...flap.cutLines].flat().map((p) => p.y)
    const xs = [...back.cutLines, ...flap.cutLines].flat().map((p) => p.x)

    expect(Math.max(...ys) - Math.min(...ys)).toBe(300 + 50)
    expect(Math.max(...xs) - Math.min(...xs)).toBe(240)
  })

  it("joins front and back along a side fold, as one piece", () => {
    const [front, back] = generateCourierBag(params)
    const frontRight = Math.max(...front.cutLines.flat().map((p) => p.x))
    const backLeft = Math.min(...back.cutLines.flat().map((p) => p.x))

    expect(frontRight).toBe(240)
    expect(backLeft).toBe(240)
    expect(front.creaseLines).toEqual([
      [
        { x: 240, y: 0 },
        { x: 240, y: 300 },
      ],
    ])
  })

  it("lets artwork wrap across the side fold and the flap crease", () => {
    const wraps = deriveWrapZones(generateCourierBag(params))

    expect(wraps.map((w) => [w.panels, w.seamAxis, w.seamCoordinate])).toEqual(
      expect.arrayContaining([
        [["Bag-Front", "Bag-Back"], "vertical", 240],
        [["Bag-Back", "Bag-Flap"], "horizontal", 300],
      ])
    )
    expect(wraps).toHaveLength(2)
  })

  it("rejects a flap that isn't shorter than the bag", () => {
    expect(() => generateCourierBag({ ...params, flapHeight: 300 })).toThrow()
    expect(() => generateCourierBag({ ...params, flapHeight: 0 })).toThrow()
  })
})
