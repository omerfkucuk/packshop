import { generateFefco0201 } from "@dtc/packaging-engine/box-styles"
import type { CompositionPlan, PanelSemanticsMap } from "@dtc/layout-engine"
import { composeDesign } from "../compose-design"
import type { ComposeInput } from "../../domain/compose-input"
import type { LlmProvider } from "../../providers/llm-provider"

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

const baseInput: ComposeInput = {
  prompt: "logoyu ortala",
  locale: "tr",
  boxType: "fefco-0201",
  availablePanels: ["front"],
  selectedElements: [
    { elementId: "logo-1", elementType: "logo", content: { url: "logo.png" } },
  ],
}

const validPlan: CompositionPlan = {
  version: "1.0",
  boxType: "fefco-0201",
  elements: [
    {
      elementId: "logo-1",
      elementType: "logo",
      content: { url: "logo.png" },
      placementKind: "absolute",
      panel: "front",
      anchor: "center",
      size: "large",
    },
  ],
}

const overlappingPlan: CompositionPlan = {
  version: "1.0",
  boxType: "fefco-0201",
  elements: [
    {
      elementId: "logo-1",
      elementType: "logo",
      content: { url: "logo.png" },
      placementKind: "absolute",
      panel: "front",
      anchor: "center",
      size: "large",
    },
    {
      elementId: "icon-1",
      elementType: "icon",
      content: {},
      placementKind: "absolute",
      panel: "front",
      anchor: "center",
      size: "large",
    },
  ],
}

describe("composeDesign", () => {
  it("returns a valid result on the first attempt when the provider gets it right", async () => {
    const provider: LlmProvider = {
      generateComposition: jest.fn().mockResolvedValue(validPlan),
    }

    const result = await composeDesign(baseInput, provider, geometry, panelSemantics)

    expect(result.constraintReport.valid).toBe(true)
    expect(provider.generateComposition).toHaveBeenCalledTimes(1)
  })

  it("retries with the violations attached when the plan has a constraint error, and succeeds once fixed", async () => {
    const generateComposition = jest
      .fn()
      .mockResolvedValueOnce(overlappingPlan)
      .mockResolvedValueOnce(validPlan)
    const provider: LlmProvider = { generateComposition }

    const result = await composeDesign(baseInput, provider, geometry, panelSemantics)

    expect(result.constraintReport.valid).toBe(true)
    expect(generateComposition).toHaveBeenCalledTimes(2)

    const secondCallInput = generateComposition.mock.calls[1][0] as ComposeInput
    expect(secondCallInput.priorAttempt?.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "no-element-overlap" }),
      ])
    )
  })

  it("returns the last attempt with violations still visible after exhausting retries", async () => {
    const provider: LlmProvider = {
      generateComposition: jest.fn().mockResolvedValue(overlappingPlan),
    }

    const result = await composeDesign(baseInput, provider, geometry, panelSemantics)

    expect(result.constraintReport.valid).toBe(false)
    expect(provider.generateComposition).toHaveBeenCalledTimes(3)
  })

  it("restores content from the selected element when the provider drops it but sets sourceElementId (regression: observed with a real model)", async () => {
    const planWithDroppedContent: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "logo-1",
          elementType: "logo",
          content: {}, // dropped by the provider
          sourceElementId: "logo-1",
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "large",
        },
      ],
    }
    const provider: LlmProvider = {
      generateComposition: jest.fn().mockResolvedValue(planWithDroppedContent),
    }

    const result = await composeDesign(baseInput, provider, geometry, panelSemantics)

    expect(result.constraintReport.valid).toBe(true)
    expect(result.compositionPlan.elements[0].content).toEqual({ url: "logo.png" })
    const resolvedLogo = result.resolvedLayout.panels[0].elements[0]
    expect(resolvedLogo.content).toEqual({ url: "logo.png" })
  })

  it("retries when sourceElementId references an element that wasn't actually selected", async () => {
    const planWithBadSource: CompositionPlan = {
      version: "1.0",
      boxType: "fefco-0201",
      elements: [
        {
          elementId: "logo-1",
          elementType: "logo",
          content: {},
          sourceElementId: "does-not-exist",
          placementKind: "absolute",
          panel: "front",
          anchor: "center",
          size: "large",
        },
      ],
    }
    const generateComposition = jest
      .fn()
      .mockResolvedValueOnce(planWithBadSource)
      .mockResolvedValueOnce(validPlan)
    const provider: LlmProvider = { generateComposition }

    const result = await composeDesign(baseInput, provider, geometry, panelSemantics)

    expect(result.constraintReport.valid).toBe(true)
    expect(generateComposition).toHaveBeenCalledTimes(2)
    const secondCallInput = generateComposition.mock.calls[1][0] as ComposeInput
    expect(secondCallInput.priorAttempt?.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "unknown-source-element" }),
      ])
    )
  })

  it("throws once retries are exhausted if every attempt fails schema validation", async () => {
    const provider: LlmProvider = {
      // Missing required fields (no "version"/"elements") - fails the zod schema.
      generateComposition: jest.fn().mockResolvedValue({ boxType: "fefco-0201" } as any),
    }

    await expect(
      composeDesign(baseInput, provider, geometry, panelSemantics)
    ).rejects.toThrow(/Failed to produce a valid composition/)
    expect(provider.generateComposition).toHaveBeenCalledTimes(3)
  })
})
