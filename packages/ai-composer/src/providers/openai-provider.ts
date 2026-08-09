import OpenAI from "openai"
import type { CompositionPlan } from "@dtc/layout-engine"
import type { ComposeInput } from "../domain/compose-input"
import { THEMES, type ThemeId } from "../domain/theme"
import type { LlmProvider } from "./llm-provider"

const DEFAULT_MODEL = "gpt-4o-mini"
const DEFAULT_THEME: ThemeId = "sade"

// Kept in one place so a schema change in @dtc/layout-engine only needs
// updating here, not re-derived by hand every time - this is prose, not
// the zod schema itself, because response_format stays "json_object"
// rather than OpenAI's stricter "json_schema" mode (see the class comment
// below for why).
const RESPONSE_FORMAT_INSTRUCTIONS = `
Respond with a single JSON object, no prose, matching exactly this shape:

{
  "version": "1.0",
  "boxType": "<the boxType given below, unchanged>",
  "elements": [
    // Each item is EITHER an "absolute" or a "relative" placement:
    {
      "elementId": "<unique string>",
      "elementType": "logo" | "text" | "qr" | "barcode" | "image" | "icon" | "shape" | "pattern",
      "content": {},               // leave {} when sourceElementId is set (see rules below);
                                    // only fill this in for a decorative element you invent yourself
      "sourceElementId": "<elementId from the selected elements list below, if this placement reuses one>",
      "placementKind": "absolute",
      "panel": "<one of the available panels below>",
      "anchor": "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right",
      "size": "small" | "medium" | "large" | "full-width" | "full-height",   // optional
      "marginHint": "tight" | "normal" | "loose"                             // optional
    },
    {
      "elementId": "<unique string>",
      "elementType": "...",
      "content": {},
      "sourceElementId": "...",    // same rule as above
      "placementKind": "relative",
      "panel": "<one of the available panels below>",
      "relativeTo": "<elementId of another element already in this array, positioned before it>",
      "position": "above" | "below" | "left-of" | "right-of" | "inside",
      "gapHint": "tight" | "normal" | "loose",                               // optional
      "size": "small" | "medium" | "large" | "full-width" | "full-height"    // optional
    }
  ]
}

Rules:
- You decide WHAT goes WHERE in semantic terms only - never output x/y
  coordinates or pixel/mm values anywhere.
- Every "panel" value must be one of the available panels given below.
- Every selected brand element the user picked should generally appear at
  least once; you may repeat one across multiple panels (e.g. a logo on
  every main face) by giving each repeat its own unique elementId, but ALL
  repeats must set "sourceElementId" to that same original selected
  element's elementId - never invent or guess its content yourself, and
  never leave "sourceElementId" unset for a placement that reuses a
  selected element.
- A "relative" element's "relativeTo" must reference an elementId that
  appears earlier in the "elements" array and is on the SAME panel.
- Do not introduce a reference cycle between relative elements.
`.trim()

function describeSelectedElements(input: ComposeInput): string {
  if (input.selectedElements.length === 0) return "(none selected)"
  return input.selectedElements
    .map((el) => {
      const preview =
        el.elementType === "text" && typeof el.content.text === "string"
          ? ` — text: "${el.content.text}"`
          : ""
      return `- elementId "${el.elementId}", elementType "${el.elementType}"${preview}`
    })
    .join("\n")
}

function buildSystemPrompt(input: ComposeInput): string {
  const theme = THEMES[input.theme ?? DEFAULT_THEME]

  const parts = [
    "You are the composition step of a packaging design pipeline. You decide " +
      "semantic placement of brand elements on a physical package; a separate, " +
      "deterministic layout engine turns your decisions into real coordinates, " +
      "and a constraint engine validates the result - you never touch geometry.",
    `Box type: ${input.boxType}`,
    `Available panels: ${input.availablePanels.join(", ")}`,
    `Locale for reasoning about the user's prompt: ${input.locale}`,
    `Style guidance (theme "${theme.label}"): ${theme.styleGuidance}`,
    `Selected brand elements to place:\n${describeSelectedElements(input)}`,
    RESPONSE_FORMAT_INSTRUCTIONS,
  ]

  if (input.priorAttempt) {
    const violationLines = input.priorAttempt.violations
      .map((v) => `- [${v.severity}] ${v.ruleId}: ${v.message}`)
      .join("\n")
    parts.push(
      "Your previous attempt had problems and must be corrected:\n" +
        `Previous plan:\n${JSON.stringify(input.priorAttempt.plan)}\n` +
        `Problems found:\n${violationLines}\n` +
        "Produce a corrected plan that avoids all of the above - e.g. move or " +
        "resize overlapping elements so they no longer intersect."
    )
  }

  return parts.join("\n\n")
}

// Uses Chat Completions' "json_object" mode (guarantees syntactically valid
// JSON) rather than OpenAI's stricter "json_schema" strict mode: this
// project's CompositionPlan is a discriminated union (absolute vs. relative
// placement) with optional fields, which strict mode's JSON Schema subset
// (no oneOf-with-differing-required, no true optionals) can't express
// cleanly without contorting the domain model. Instead, the prompt spells
// out the exact shape in prose and every response is zod-validated by the
// composeDesign use case regardless - "json_object" plus real validation
// plus the retry-with-feedback loop is the same safety net, just without
// fighting the stricter mode's shape constraints.
export class OpenAiProvider implements LlmProvider {
  private client: OpenAI

  constructor(apiKey: string, private model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({ apiKey })
  }

  async generateComposition(input: ComposeInput): Promise<CompositionPlan> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input) },
        {
          role: "user",
          content: input.prompt.trim() || "(no specific instructions given)",
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      throw new Error("OpenAI returned an empty composition response")
    }

    // Parsed as unknown JSON here - schema validation (does this actually
    // match CompositionPlan?) is the composeDesign use case's job, not this
    // provider's; this cast just gets it out of the SDK's response shape.
    const parsed = JSON.parse(raw) as CompositionPlan

    return {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        promptUsed: input.prompt,
        aiModel: this.model,
        generatedAt: new Date().toISOString(),
      },
    }
  }
}
