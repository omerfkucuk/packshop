import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  composeDesign,
  MockLlmProvider,
  OpenAiProvider,
  type ComposeInput,
} from "@dtc/ai-composer"
import type { PanelSemanticsMap } from "@dtc/layout-engine"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"

type ComposeRequestBody = Omit<ComposeInput, "priorAttempt"> & {
  panels: PanelGeometry[]
  panelSemantics: PanelSemanticsMap
}

// AI orchestration lives here (not the storefront) so the OpenAI API key
// never reaches the browser - see docs/ai-layout-engine-architecture.md
// §3. The storefront already computes PanelGeometry client-side for the
// live rule-based preview, so it's cheaper to have it send that geometry
// along than to regenerate it here.
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = req.body as ComposeRequestBody

  if (!body?.prompt?.trim()) {
    res.status(400).json({ message: "prompt is required" })
    return
  }
  if (!body.boxType || !body.availablePanels?.length) {
    res.status(400).json({ message: "boxType and availablePanels are required" })
    return
  }
  if (!body.panels?.length) {
    res.status(400).json({ message: "panels is required" })
    return
  }
  if (!body.panelSemantics || Object.keys(body.panelSemantics).length === 0) {
    res.status(400).json({ message: "panelSemantics is required" })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn(
      "[designs/compose] OPENAI_API_KEY is not set - falling back to MockLlmProvider"
    )
  }
  const provider = apiKey ? new OpenAiProvider(apiKey) : new MockLlmProvider()

  try {
    const result = await composeDesign(
      {
        prompt: body.prompt,
        locale: body.locale,
        boxType: body.boxType,
        availablePanels: body.availablePanels,
        selectedElements: body.selectedElements,
        theme: body.theme,
      },
      provider,
      body.panels,
      body.panelSemantics
    )
    res.json(result)
  } catch (err) {
    res.status(502).json({
      message: err instanceof Error ? err.message : "Failed to generate design",
    })
  }
}
