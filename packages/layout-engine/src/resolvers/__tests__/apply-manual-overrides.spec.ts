import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import { resolveLayout } from "../layout-resolver"
import { applyManualOverrides } from "../apply-manual-overrides"
import { CompositionPlan } from "../../domain/semantic-placement"
import { PanelSemanticsMap } from "../../domain/panel-semantics"

const geometry = generateFefco0201({
  length: 450,
  width: 350,
  height: 250,
  thickness: 3,
})

const panelSemantics: PanelSemanticsMap = {
  front: "Panel-L1",
  right: "Panel-W1",
  back: "Panel-L2",
  left: "Panel-W2",
}

const plan: CompositionPlan = {
  version: "1.0",
  boxType: "fefco-0201",
  elements: [
    {
      elementId: "logo",
      elementType: "logo",
      content: { url: "logo.png" },
      placementKind: "absolute",
      panel: "front",
      anchor: "center",
      size: "large",
    },
    {
      elementId: "slogan",
      elementType: "text",
      content: { text: "Hello" },
      placementKind: "relative",
      panel: "front",
      relativeTo: "logo",
      position: "below",
    },
  ],
}

const layout = resolveLayout(plan, geometry, { panelSemantics })

describe("applyManualOverrides", () => {
  it("moves the overridden element to the given position", () => {
    const overridden = applyManualOverrides(layout, { logo: { x: 10, y: 20 } })
    const logo = overridden.panels[0].elements.find((el) => el.elementId === "logo")!
    expect(logo.position).toEqual({ x: 10, y: 20 })
  })

  it("leaves untouched elements as the exact same object reference", () => {
    const overridden = applyManualOverrides(layout, { logo: { x: 10, y: 20 } })
    const originalSlogan = layout.panels[0].elements.find((el) => el.elementId === "slogan")
    const overriddenSlogan = overridden.panels[0].elements.find((el) => el.elementId === "slogan")
    expect(overriddenSlogan).toBe(originalSlogan)
  })

  it("keeps the original size when the override only sets x/y", () => {
    const logoOriginal = layout.panels[0].elements.find((el) => el.elementId === "logo")!
    const overridden = applyManualOverrides(layout, { logo: { x: 10, y: 20 } })
    const logo = overridden.panels[0].elements.find((el) => el.elementId === "logo")!
    expect(logo.size).toEqual(logoOriginal.size)
  })

  it("resizes when the override sets w/h too", () => {
    const overridden = applyManualOverrides(layout, { logo: { x: 10, y: 20, w: 99, h: 88 } })
    const logo = overridden.panels[0].elements.find((el) => el.elementId === "logo")!
    expect(logo.size).toEqual({ w: 99, h: 88 })
  })

  it("is a no-op for an elementId that doesn't exist in the layout", () => {
    const overridden = applyManualOverrides(layout, { "does-not-exist": { x: 1, y: 1 } })
    expect(overridden).toEqual(layout)
  })

  it("returns the exact same layout reference when overrides is empty", () => {
    expect(applyManualOverrides(layout, {})).toBe(layout)
  })
})
