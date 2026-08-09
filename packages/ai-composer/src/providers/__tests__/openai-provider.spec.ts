const createMock = jest.fn()

jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: createMock } },
    })),
  }
})

import { OpenAiProvider } from "../openai-provider"
import type { ComposeInput } from "../../domain/compose-input"

const baseInput: ComposeInput = {
  prompt: "logoyu sağ üst köşeye koy",
  locale: "tr",
  boxType: "fefco-0201",
  availablePanels: ["front", "back"],
  selectedElements: [
    { elementId: "logo-1", elementType: "logo", content: { url: "logo.png" } },
  ],
  theme: "premium",
}

const rawPlanJson = {
  version: "1.0",
  boxType: "fefco-0201",
  elements: [
    {
      elementId: "logo-1",
      elementType: "logo",
      content: { url: "logo.png" },
      placementKind: "absolute",
      panel: "front",
      anchor: "top-right",
      size: "large",
    },
  ],
}

beforeEach(() => {
  createMock.mockReset()
  createMock.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(rawPlanJson) } }],
  })
})

describe("OpenAiProvider", () => {
  it("requests json_object mode and includes the prompt plus box/panel/theme context in the system message", async () => {
    const provider = new OpenAiProvider("test-key")
    await provider.generateComposition(baseInput)

    expect(createMock).toHaveBeenCalledTimes(1)
    const call = createMock.mock.calls[0][0]

    expect(call.response_format).toEqual({ type: "json_object" })
    expect(call.messages[0].role).toBe("system")
    expect(call.messages[0].content).toContain("fefco-0201")
    expect(call.messages[0].content).toContain("front, back")
    expect(call.messages[0].content).toContain("logo-1")
    expect(call.messages[1]).toEqual({ role: "user", content: baseInput.prompt })
  })

  it("includes prior violations in the system prompt on a retry", async () => {
    const provider = new OpenAiProvider("test-key")
    await provider.generateComposition({
      ...baseInput,
      priorAttempt: {
        plan: rawPlanJson as any,
        violations: [
          {
            elementId: "logo-1",
            ruleId: "no-element-overlap",
            severity: "error",
            message: '"logo-1" overlaps "icon-1" on panel "Panel-L1"',
          },
        ],
      },
    })

    const call = createMock.mock.calls[0][0]
    expect(call.messages[0].content).toContain("no-element-overlap")
    expect(call.messages[0].content).toContain("overlaps")
  })

  it("stamps metadata (promptUsed, aiModel, generatedAt) onto the parsed plan", async () => {
    const provider = new OpenAiProvider("test-key", "gpt-4o-mini")
    const plan = await provider.generateComposition(baseInput)

    expect(plan.elements).toEqual(rawPlanJson.elements)
    expect(plan.metadata?.promptUsed).toBe(baseInput.prompt)
    expect(plan.metadata?.aiModel).toBe("gpt-4o-mini")
    expect(plan.metadata?.generatedAt).toBeTruthy()
  })

  it("throws when OpenAI returns no content", async () => {
    createMock.mockResolvedValue({ choices: [{ message: {} }] })
    const provider = new OpenAiProvider("test-key")

    await expect(provider.generateComposition(baseInput)).rejects.toThrow(
      /empty composition response/
    )
  })
})
