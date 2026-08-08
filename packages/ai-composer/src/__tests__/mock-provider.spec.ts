import { MockLlmProvider } from "../providers/mock-provider"
import type { ComposeInput } from "../domain/compose-input"
import type { AbsolutePlacement, RelativePlacement } from "@dtc/layout-engine"

const baseInput: ComposeInput = {
  prompt: "",
  locale: "tr",
  boxType: "fefco-0201",
  availablePanels: ["front", "back", "left", "right"],
  selectedElements: [
    { elementId: "logo-1", elementType: "logo", content: { url: "logo.png" } },
    { elementId: "text-1", elementType: "text", content: { text: "Merhaba" } },
  ],
}

const provider = new MockLlmProvider()

describe("MockLlmProvider", () => {
  it("places the logo per the theme's default anchor when the prompt gives no hint", async () => {
    const plan = await provider.generateComposition({ ...baseInput, theme: "premium" })
    const frontLogo = plan.elements.find(
      (el) => el.elementId === "logo-front"
    ) as AbsolutePlacement
    expect(frontLogo.anchor).toBe("center")
    expect(frontLogo.size).toBe("large")
  })

  it("a positional keyword in the prompt overrides the theme's default anchor", async () => {
    const plan = await provider.generateComposition({
      ...baseInput,
      theme: "premium",
      prompt: "logoyu sağ üst köşeye koy",
    })
    const frontLogo = plan.elements.find(
      (el) => el.elementId === "logo-front"
    ) as AbsolutePlacement
    expect(frontLogo.anchor).toBe("top-right")
  })

  it("'sade' repeats the slogan on only one panel, 'sicak' repeats it on every panel", async () => {
    const sade = await provider.generateComposition({ ...baseInput, theme: "sade" })
    const sicak = await provider.generateComposition({ ...baseInput, theme: "sicak" })

    const sadeSlogans = sade.elements.filter((el) => el.elementType === "text")
    const sicakSlogans = sicak.elements.filter((el) => el.elementType === "text")

    expect(sadeSlogans).toHaveLength(1)
    expect(sicakSlogans).toHaveLength(4)
  })

  it("places the slogan relative-below the logo when a logo is selected", async () => {
    const plan = await provider.generateComposition({ ...baseInput, theme: "sicak" })
    const slogan = plan.elements.find(
      (el) => el.elementId === "slogan-front"
    ) as RelativePlacement
    expect(slogan.placementKind).toBe("relative")
    expect(slogan.relativeTo).toBe("logo-front")
    expect(slogan.position).toBe("below")
  })

  it("skips the slogan entirely when none is selected, without erroring", async () => {
    const plan = await provider.generateComposition({
      ...baseInput,
      theme: "sicak",
      selectedElements: [baseInput.selectedElements[0]],
    })
    expect(plan.elements.some((el) => el.elementType === "text")).toBe(false)
  })

  it("stamps metadata with the prompt used and a generatedAt timestamp", async () => {
    const plan = await provider.generateComposition({
      ...baseInput,
      prompt: "test prompt",
    })
    expect(plan.metadata?.promptUsed).toBe("test prompt")
    expect(plan.metadata?.generatedAt).toBeTruthy()
  })
})
