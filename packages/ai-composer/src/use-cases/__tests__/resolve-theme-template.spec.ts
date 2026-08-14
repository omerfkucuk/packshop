import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import { resolveLayout, type PanelSemanticsMap } from "@dtc/layout-engine"
import { resolveThemeTemplate, type SlotResolver } from "../resolve-theme-template"
import { THEMES } from "../../domain/theme"

const availablePanels = ["front", "back", "left", "right"] as const

const fullResolver: SlotResolver = (slot) => {
  if (slot === "brand-logo") return { elementType: "logo", content: { url: "logo.png" } }
  if (slot === "brand-slogan") return { elementType: "text", content: { text: "Merhaba" } }
  if (slot === "brand-social-link") return { elementType: "text", content: { text: "@marka" } }
  return { elementType: "pattern", content: { libraryElementId: slot.libraryElement } }
}

const emptyResolver: SlotResolver = () => null

describe("resolveThemeTemplate", () => {
  it("places the slogan relative-below the logo when both resolve", () => {
    const plan = resolveThemeTemplate(THEMES.sade, "fefco-0201", [...availablePanels], fullResolver)
    const slogan = plan.elements.find((el) => el.elementId === "slogan-front")
    expect(slogan?.placementKind).toBe("relative")
    expect(slogan && "relativeTo" in slogan && slogan.relativeTo).toBe("logo-front")
  })

  it("places the slogan absolute-centered when there is no logo", () => {
    const resolver: SlotResolver = (slot) =>
      slot === "brand-logo" ? null : fullResolver(slot)
    const plan = resolveThemeTemplate(THEMES.sade, "fefco-0201", [...availablePanels], resolver)
    const slogan = plan.elements.find((el) => el.elementId === "slogan-front")
    expect(slogan?.placementKind).toBe("absolute")
  })

  it("respects sloganOnEveryPanel: sade repeats on one panel, eglenceli on every panel", () => {
    const sade = resolveThemeTemplate(THEMES.sade, "fefco-0201", [...availablePanels], fullResolver)
    const eglenceli = resolveThemeTemplate(THEMES.eglenceli, "fefco-0201", [...availablePanels], fullResolver)

    expect(sade.elements.filter((el) => el.elementType === "text")).toHaveLength(1)
    // eglenceli's slogan appears on every panel PLUS the social link (also
    // elementType "text") appears once on the first panel only.
    expect(eglenceli.elements.filter((el) => el.elementType === "text")).toHaveLength(5)
  })

  it("only produces a decorative element / social link when the theme's defaults declare one", () => {
    const sade = resolveThemeTemplate(THEMES.sade, "fefco-0201", [...availablePanels], fullResolver)
    const eglenceli = resolveThemeTemplate(THEMES.eglenceli, "fefco-0201", [...availablePanels], fullResolver)

    expect(sade.elements.some((el) => el.elementType === "pattern")).toBe(false)
    expect(eglenceli.elements.filter((el) => el.elementType === "pattern")).toHaveLength(4) // every main panel

    const social = eglenceli.elements.find((el) => el.elementId === "social-front")
    expect(social).toBeDefined()
    expect(eglenceli.elements.some((el) => el.elementId === "social-back")).toBe(false) // first panel only
  })

  it("returns an empty plan without throwing when every slot resolves to null", () => {
    const plan = resolveThemeTemplate(THEMES.eglenceli, "fefco-0201", [...availablePanels], emptyResolver)
    expect(plan.elements).toEqual([])
  })

  it("resolves against real FEFCO 0201 geometry with positions inside the front panel's print zone", () => {
    const geometry = generateFefco0201({ length: 450, width: 350, height: 250, thickness: 3 })
    const panelSemantics: PanelSemanticsMap = {
      front: "Panel-L1",
      right: "Panel-W1",
      back: "Panel-L2",
      left: "Panel-W2",
    }

    const plan = resolveThemeTemplate(THEMES.eglenceli, "fefco-0201", [...availablePanels], fullResolver)
    const layout = resolveLayout(plan, geometry, { panelSemantics })

    const frontPanel = layout.panels.find((p) => p.panelName === "Panel-L1")!
    const zone = geometry.find((p) => p.panelName === "Panel-L1")!.printZones[0]
    const zoneMinX = Math.min(...zone.boundary.map((p) => p.x))
    const zoneMaxX = Math.max(...zone.boundary.map((p) => p.x))

    expect(frontPanel.elements.length).toBeGreaterThan(0)
    for (const el of frontPanel.elements) {
      expect(el.position.x).toBeGreaterThanOrEqual(zoneMinX)
      expect(el.position.x + el.size.w).toBeLessThanOrEqual(zoneMaxX)
    }
  })
})
