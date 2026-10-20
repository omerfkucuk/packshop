import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { validateBusinessEmail } from "../../../lib/business-email"

/**
 * Server-side gate for metadata.business_email on POST /store/customers/me -
 * both the profile page and the checkout profile prompt write it through
 * that core route. Only a *changed* value is checked, so a legacy free-mail
 * address saved before this rule existed doesn't block unrelated updates
 * (the checkout prompt resends the whole metadata object).
 */
export async function validateBusinessEmailMiddleware(
  req: MedusaRequest<{ metadata?: Record<string, unknown> | null }>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const businessEmail = req.body?.metadata?.business_email
  if (typeof businessEmail !== "string") {
    return next()
  }

  const customerId = (req as any).auth_context?.actor_id
  if (customerId) {
    const customer = await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(customerId)
    if (customer.metadata?.business_email === businessEmail) {
      return next()
    }
  }

  const error = validateBusinessEmail(businessEmail)
  if (error) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
  }

  req.body!.metadata!.business_email = businessEmail.trim().toLowerCase()
  next()
}
