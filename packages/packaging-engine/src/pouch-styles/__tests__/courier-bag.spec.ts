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

    // 8mm side seals, 5mm bottom, flap (50) + 5mm at the top.
    expect(zone.boundingBox).toEqual({ w: 240 - 16, h: 300 - 5 - 55 })
    expect(Math.max(...zone.boundary.map((p) => p.y))).toBe(300 - 55)
  })

  it("makes the printable back side width x (height + flap)", () => {
    const [, back, flap] = generateCourierBag(params)
    const ys = [...back.cutLines, ...flap.cutLines].flat().map((p) => p.y)
    const xs = [...back.cutLines, ...flap.cutLines].flat().map((p) => p.x)

    expect(Math.max(...ys) - Math.min(...ys)).toBe(300 + 50)
    expect(Math.max(...xs) - Math.min(...xs)).toBe(240)
  })

  it("hinges the flap to the back with a crease, so artwork can wrap across it", () => {
    const wraps = deriveWrapZones(generateCourierBag(params))

    expect(wraps).toHaveLength(1)
    expect(wraps[0].panels).toEqual(["Bag-Back", "Bag-Flap"])
    expect(wraps[0].seamAxis).toBe("horizontal")
    expect(wraps[0].seamCoordinate).toBe(300)
  })

  it("rejects a flap that isn't shorter than the bag", () => {
    expect(() => generateCourierBag({ ...params, flapHeight: 300 })).toThrow()
    expect(() => generateCourierBag({ ...params, flapHeight: 0 })).toThrow()
  })
})
