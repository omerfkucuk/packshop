import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import {
  resolveLayout,
  UnknownPanelError,
  UnresolvedZoneError,
} from "../layout-resolver"
import { CompositionPlan } from "../../domain/semantic-placement"
import { PanelSemanticsMap } from "../../domain/panel-semantics"

const geometry = generateFefco0201({
  length: 450,
  width: 350,
  height: 250,
  thickness: 3,
})

const fefco0201PanelSemantics: PanelSemanticsMap = {
  front: "Panel-L1",
  right: "Panel-W1",
  back: "Panel-L2",
  left: "Panel-W2",
}

const basicPlan: CompositionPlan = {
  version: "1.0",
  boxType: "fefco-0201",
  elements: [
    {
      elementId: "logo",
      elementType: "logo",
      content: { url: "https://example.com/logo.png" },
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

describe("resolveLayout", () => {
  it("resolves an absolute + relative plan against real FEFCO 0201 geometry", () => {
    const layout = resolveLayout(basicPlan, geometry, {
      panelSemantics: fefco0201PanelSemantics,
    })

    expect(layout.boxType).toBe("fefco-0201")
    const frontPanel = layout.panels.find((p) => p.panelName === "Panel-L1")
    expect(frontPanel?.elements).toHaveLength(2)

    const logo = frontPanel!.elements.find((el) => el.elementId === "logo")!
    const slogan = frontPanel!.elements.find((el) => el.elementId === "slogan")!

    // The slogan is below the logo (smaller Y, Y-up space).
    expect(slogan.position.y).toBeLessThan(logo.position.y)

    // Both stay within the front panel's own print zone bounds.
    const zone = geometry.find((p) => p.panelName === "Panel-L1")!.printZones[0]
    const zoneMinX = Math.min(...zone.boundary.map((p) => p.x))
    const zoneMaxX = Math.max(...zone.boundary.map((p) => p.x))
    for (const el of [logo, slogan]) {
      expect(el.position.x).toBeGreaterThanOrEqual(zoneMinX)
      expect(el.position.x + el.size.w).toBeLessThanOrEqual(zoneMaxX)
    }
  })

  it("gives scannable codes a higher default z-index than decorative elements", () => {
    const plan: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "qr",
          elementType: "qr",
          content: {},
          placementKind: "absolute",
          panel: "right",
          anchor: "bottom-right",
        },
        {
          elementId: "bg",
          elementType: "shape",
          content: {},
          placementKind: "absolute",
          panel: "right",
          anchor: "center",
          size: "full-width",
        },
      ],
    }

    const layout = resolveLayout(plan, geometry, {
      panelSemantics: fefco0201PanelSemantics,
    })
    const panel = layout.panels.find((p) => p.panelName === "Panel-W1")!
    const qr = panel.elements.find((el) => el.elementId === "qr")!
    const bg = panel.elements.find((el) => el.elementId === "bg")!
    expect(qr.zIndex).toBeGreaterThan(bg.zIndex)
  })

  it("throws UnknownPanelError when the plan references a panel this box type has no mapping for", () => {
    const plan: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "logo",
          elementType: "logo",
          content: {},
          placementKind: "absolute",
          panel: "top", // not in fefco0201PanelSemantics
          anchor: "center",
        },
      ],
    }
    expect(() =>
      resolveLayout(plan, geometry, { panelSemantics: fefco0201PanelSemantics })
    ).toThrow(UnknownPanelError)
  })

  it("throws UnresolvedZoneError when mapped to a panel with no print zone (e.g. the glue tab)", () => {
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
        },
      ],
    }
    expect(() =>
      resolveLayout(plan, geometry, { panelSemantics: { front: "GlueTab" } })
    ).toThrow(UnresolvedZoneError)
  })

  it("lets a known natural size (e.g. a real logo's own aspect ratio) override the size hint", () => {
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
          size: "small",
        },
      ],
    }
    const layout = resolveLayout(plan, geometry, {
      panelSemantics: fefco0201PanelSemantics,
      computeNaturalSize: () => ({ w: 999, h: 1 }), // absurd aspect ratio, easy to spot
    })
    const logo = layout.panels[0].elements[0]
    // fitCenter still contains it within the zone, but the aspect ratio
    // should reflect the forced natural size, not the square "small" bucket.
    expect(logo.size.w).toBeGreaterThan(logo.size.h * 10)
  })
})
