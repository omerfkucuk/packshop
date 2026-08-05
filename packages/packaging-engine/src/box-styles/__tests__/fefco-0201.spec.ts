import { generateFefco0201 } from "../fefco-0201"

describe("generateFefco0201", () => {
  it("returns the 4 main panels plus a glue tab, in order", () => {
    const panels = generateFefco0201({
      length: 300,
      width: 200,
      height: 250,
      thickness: 3,
    })

    expect(panels.map((p) => p.panelName)).toEqual([
      "Panel-L1",
      "Panel-W1",
      "Panel-L2",
      "Panel-W2",
      "GlueTab",
    ])
  })

  it("sizes each main panel's print zone to its own width/height minus the safety margin", () => {
    const length = 300
    const width = 200
    const height = 250

    const panels = generateFefco0201({ length, width, height, thickness: 3 })
    const [l1, w1, l2, w2] = panels

    expect(l1.printZones[0].boundingBox).toEqual({ w: length - 10, h: height - 10 })
    expect(w1.printZones[0].boundingBox).toEqual({ w: width - 10, h: height - 10 })
    expect(l2.printZones[0].boundingBox).toEqual({ w: length - 10, h: height - 10 })
    expect(w2.printZones[0].boundingBox).toEqual({ w: width - 10, h: height - 10 })
  })

  it("gives the glue tab no print zone and a width that grows with board thickness", () => {
    const thin = generateFefco0201({ length: 300, width: 200, height: 250, thickness: 1 })
    const thick = generateFefco0201({ length: 300, width: 200, height: 250, thickness: 5 })

    const thinGlueTab = thin[thin.length - 1]
    const thickGlueTab = thick[thick.length - 1]

    expect(thinGlueTab.printZones).toEqual([])

    // Glue tab width = right edge x - left edge x, both readable off its cut lines.
    const glueTabWidth = (panel: typeof thinGlueTab) => {
      const xs = panel.cutLines.flat().map((p) => p.x)
      return Math.max(...xs) - Math.min(...xs)
    }

    expect(glueTabWidth(thickGlueTab)).toBeGreaterThan(glueTabWidth(thinGlueTab))
  })

  it("makes the overall sheet height equal to box height plus box width (two half-width flap depths)", () => {
    const width = 200
    const height = 250

    const panels = generateFefco0201({ length: 300, width, height, thickness: 3 })
    const firstPanel = panels[0]

    const ys = firstPanel.cutLines.flat().map((p) => p.y)
    const totalHeight = Math.max(...ys) - Math.min(...ys)

    expect(totalHeight).toBeCloseTo(height + width)
  })

  it("makes inner (width-panel) flaps shorter than outer (length-panel) flaps", () => {
    const panels = generateFefco0201({
      length: 300,
      width: 200,
      height: 250,
      thickness: 3,
    })
    const [l1, w1] = panels

    const flapDepth = (panel: typeof l1) => {
      const ys = panel.cutLines.flat().map((p) => p.y)
      const mainTopY = panel.creaseLines[0][0].y
      return Math.max(...ys) - mainTopY
    }

    expect(flapDepth(w1)).toBeLessThan(flapDepth(l1))
  })

  it.each([
    [{ length: 0, width: 200, height: 250, thickness: 3 }],
    [{ length: 300, width: -10, height: 250, thickness: 3 }],
    [{ length: 300, width: 200, height: 0, thickness: 3 }],
    [{ length: 300, width: 200, height: 250, thickness: -1 }],
  ])("rejects invalid params %p", (params) => {
    expect(() => generateFefco0201(params)).toThrow()
  })
})
