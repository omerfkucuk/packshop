"use server"

import { sdk } from "@lib/config"
import type {
  ComposeDesignRequestBody,
  ComposeDesignResult,
} from "@dtc/ai-composer"
import type { ManualOverrides } from "@dtc/layout-engine"
import type { ThemeId } from "@dtc/ai-composer/domain"
import type { SelectedElement } from "@modules/designer/types"
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

// The Tasarla canvas's auto-saved state for one (customer, product) pair -
// snake_case throughout, mirroring the backend's design_draft table
// directly (same convention as Brand in ./brands.ts), not the camelCase
// ComposeDesignRequestBody above (that one mirrors a TS domain type from
// @dtc/ai-composer, not a database row).
export type DesignDraft = {
  brand_id: string | null
  selected_theme: ThemeId | null
  selected_elements: SelectedElement[]
  manual_overrides: ManualOverrides
}

export const getDesignDraft = async (
  productId: string
): Promise<DesignDraft | null> => {
  const headers = { ...(await getAuthHeaders()) }

  return sdk.client
    .fetch<{ draft: DesignDraft | null }>(
      `/store/designs/draft?product_id=${productId}`,
      { method: "GET", headers, cache: "no-store" }
    )
    .then(({ draft }) => draft)
    .catch(() => null)
}

// Best-effort and silent by design - an auto-save that fails mid-edit
// should never interrupt or alarm the customer; the next debounced save
// (or their next visit) just tries again.
export const saveDesignDraft = async (params: {
  product_id: string
  brand_id: string | null
  selected_theme: ThemeId | null
  selected_elements: SelectedElement[]
  manual_overrides: ManualOverrides
}): Promise<void> => {
  const headers = { ...(await getAuthHeaders()) }

  await sdk.client
    .fetch("/store/designs/draft", { method: "PUT", headers, body: params })
    .catch(() => {})
}
