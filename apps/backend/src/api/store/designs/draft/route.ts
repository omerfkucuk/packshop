import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DESIGN_MODULE } from "../../../../modules/design"
import DesignModuleService from "../../../../modules/design/services/design-module-service"

type SaveDraftBody = {
  product_id?: string
  brand_id?: string | null
  selected_elements?: unknown[]
  manual_overrides?: Record<string, unknown>
  selected_theme?: string | null
}

// Auto-saved, not a resource the customer names/manages by id - GET/PUT
// are both keyed by (customer_id, product_id) rather than a draft id, so
// the storefront never has to track one.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const productId = req.query.product_id as string | undefined

  if (!productId) {
    res.status(400).json({ message: "product_id is required" })
    return
  }

  const designModuleService: DesignModuleService = req.scope.resolve(DESIGN_MODULE)
  const [draft] = await designModuleService.listDesignDrafts({
    customer_id: customerId,
    product_id: productId,
  })

  res.json({ draft: draft ?? null })
}

export async function PUT(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const body = req.body as SaveDraftBody

  if (!body?.product_id) {
    res.status(400).json({ message: "product_id is required" })
    return
  }

  const designModuleService: DesignModuleService = req.scope.resolve(DESIGN_MODULE)

  const [existing] = await designModuleService.listDesignDrafts({
    customer_id: customerId,
    product_id: body.product_id,
  })

  const data = {
    customer_id: customerId,
    product_id: body.product_id,
    brand_id: body.brand_id ?? null,
    selected_theme: body.selected_theme ?? null,
    // model.json()'s TS type is fixed to Record<string, unknown> (no
    // generic, see @medusajs/utils/dml/properties/json.ts) - it has no way
    // to express "a JSON array," even though Postgres jsonb stores one
    // exactly as well as an object. selected_elements is genuinely an
    // array (SelectedElement[]); this cast is only working around that
    // type-level gap, not a real runtime concern.
    selected_elements: (body.selected_elements ?? []) as unknown as Record<string, unknown>,
    manual_overrides: body.manual_overrides ?? {},
  }

  const draft = existing
    ? await designModuleService.updateDesignDrafts({ id: existing.id, ...data })
    : await designModuleService.createDesignDrafts(data)

  res.json({ draft })
}
