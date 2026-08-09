"use server"

import { sdk } from "@lib/config"
import type {
  ComposeInput,
  ComposeDesignResult,
} from "@dtc/ai-composer"
import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import { getAuthHeaders } from "./cookies"

type ComposeRequestBody = Omit<ComposeInput, "priorAttempt"> & {
  panels: PanelGeometry[]
  panelSemantics: Record<string, string | undefined>
}

// Calls the backend's AI composition endpoint (Medusa, server-side) rather
// than running a real LlmProvider from the browser - the API key lives in
// apps/backend/.env only. See docs/ai-layout-engine-architecture.md §3.
export const composeAiDesign = async (
  body: ComposeRequestBody
): Promise<ComposeDesignResult> => {
  const headers = { ...(await getAuthHeaders()) }

  return sdk.client.fetch<ComposeDesignResult>("/store/designs/compose", {
    method: "POST",
    headers,
    body,
  })
}
