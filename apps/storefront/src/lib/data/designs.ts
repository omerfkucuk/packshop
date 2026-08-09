"use server"

import { sdk } from "@lib/config"
import type {
  ComposeDesignRequestBody,
  ComposeDesignResult,
} from "@dtc/ai-composer"
import { getAuthHeaders } from "./cookies"

// Calls the backend's AI composition endpoint (Medusa, server-side) rather
// than running a real LlmProvider from the browser - the API key lives in
// apps/backend/.env only. See docs/ai-layout-engine-architecture.md §3.
export const composeAiDesign = async (
  body: ComposeDesignRequestBody
): Promise<ComposeDesignResult> => {
  const headers = { ...(await getAuthHeaders()) }

  return sdk.client.fetch<ComposeDesignResult>("/store/designs/compose", {
    method: "POST",
    headers,
    body,
  })
}
