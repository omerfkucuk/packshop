import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import { resolveLayout } from "../../resolvers/layout-resolver"
import { applyManualOverrides } from "../../resolvers/apply-manual-overrides"
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

  it("catches a wrap element overlapping something on its secondary panel", () => {
    // Regression test for RuleRegistry.runAll: before it iterated the
    // authoritative `geometry` list instead of `layout.panels`, a panel
    // that only ever received a wrap element's SECONDARY touch (its own
    // primary element lives elsewhere) was skipped entirely.
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
          panel: "right",
          anchor: "center",
          size: "large",
        },
      ],
    }

    const layout = resolveLayout(plan, geometry, { panelSemantics })
    const icon = layout.panels.flatMap((p) => p.elements).find((el) => el.elementId === "icon")!

    // Wrap the front logo onto Panel-W1 (right), landing it exactly on top
    // of the icon that already lives there entirely as its own primary
    // element - the front panel itself never overlaps anything.
    const wrapped = applyManualOverrides(layout, {
      logo: { x: icon.position.x, y: icon.position.y, w: icon.size.w, h: icon.size.h, panelName: "Panel-L1", secondaryPanelName: "Panel-W1" },
    })
    const report = runConstraints(wrapped, geometry)

    expect(report.valid).toBe(false)
    expect(report.violations.some((v) => v.ruleId === "no-element-overlap")).toBe(true)
  })
})
