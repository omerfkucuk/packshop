import type { ResolvedLayout } from "../../domain/resolved-layout"
import { elementsTouchingPanel } from "../panel-elements"

const layout: ResolvedLayout = {
  boxType: "fefco-0201",
  compositionPlanVersion: "1.0",
  panels: [
    {
      panelName: "Panel-L1",
      elements: [
        {
          elementId: "logo",
          elementType: "logo",
          panelName: "Panel-L1",
          position: { x: 0, y: 0 },
          size: { w: 10, h: 10 },
          zIndex: 30,
          content: {},
          secondaryPanelName: "Panel-W1",
        },
        {
          elementId: "slogan",
          elementType: "text",
          panelName: "Panel-L1",
          position: { x: 0, y: 0 },
          size: { w: 10, h: 10 },
          zIndex: 40,
          content: {},
        },
      ],
    },
    {
      panelName: "Panel-W1",
      elements: [
        {
          elementId: "icon",
          elementType: "icon",
          panelName: "Panel-W1",
          position: { x: 0, y: 0 },
          size: { w: 10, h: 10 },
          zIndex: 20,
          content: {},
        },
      ],
    },
  ],
}

describe("elementsTouchingPanel", () => {
  it("returns a panel's own elements when nothing wraps onto it", () => {
    const elements = elementsTouchingPanel(layout, "Panel-L1")
    expect(elements.map((el) => el.elementId).sort()).toEqual(["logo", "slogan"])
  })

  it("also includes an element whose secondaryPanelName matches", () => {
    const elements = elementsTouchingPanel(layout, "Panel-W1")
    expect(elements.map((el) => el.elementId).sort()).toEqual(["icon", "logo"])
  })

  it("returns an empty array for a panel with no primary or wrapped elements", () => {
    expect(elementsTouchingPanel(layout, "Panel-L2")).toEqual([])
  })
})
