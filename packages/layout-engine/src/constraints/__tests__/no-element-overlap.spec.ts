import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import { resolveLayout } from "../../resolvers/layout-resolver"
import { runConstraints } from "../constraint-engine"
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

describe("runConstraints / no-element-overlap", () => {
  it("flags two foreground elements anchored to the same spot as an error", () => {
    const plan: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "logo",
          elementType: "logo",
          content: {},
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "large",
        },
        {
          elementId: "icon",
          elementType: "icon",
          content: {},
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "large",
        },
      ],
    }

    const layout = resolveLayout(plan, geometry, { panelSemantics })
    const report = runConstraints(layout, geometry)

    expect(report.valid).toBe(false)
    expect(
      report.violations.some((v) => v.ruleId === "no-element-overlap")
    ).toBe(true)
  })

  it("does not flag a background shape overlapping foreground content", () => {
    const plan: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "bg",
          elementType: "shape",
          content: {},
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "full-width",
        },
        {
          elementId: "logo",
          elementType: "logo",
          content: {},
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "small",
        },
      ],
    }

    const layout = resolveLayout(plan, geometry, { panelSemantics })
    const report = runConstraints(layout, geometry)

    expect(report.valid).toBe(true)
  })

  it("does not flag elements placed on different panels", () => {
    const plan: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "logo-front",
          elementType: "logo",
          content: {},
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "large",
        },
        {
          elementId: "logo-back",
          elementType: "logo",
          content: {},
          placementKind: "absolute",
          panel: "back",
          anchor: "center",
          size: "large",
        },
      ],
    }

    const layout = resolveLayout(plan, geometry, { panelSemantics })
    const report = runConstraints(layout, geometry)

    expect(report.valid).toBe(true)
  })
})
