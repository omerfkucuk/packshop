import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

// Packshop is Turkey-only, so "today" is Istanbul's calendar day.
function istanbulToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date())
}

/**
 * Records the logged-in customer's last site visit as a day
 * (metadata.last_seen_at, YYYY-MM-DD). Writes at most once per day, and the
 * resulting customer.updated event carries it to Twenty's Son Ziyaret field
 * through the normal Person sync. The write must go through the workflow:
 * the customer module service alone doesn't emit customer.updated.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModuleService.retrieveCustomer(req.auth_context.actor_id)

  const today = istanbulToday()
  if (customer.metadata?.last_seen_at === today) {
    return res.json({ updated: false })
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customer.id },
      update: { metadata: { ...customer.metadata, last_seen_at: today } },
    },
  })
  res.json({ updated: true })
}
