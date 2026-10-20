import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { validateBusinessEmail } from "../../../lib/business-email"
import { normalizeLinkedinUrl } from "../../../lib/linkedin"

/**
 * Server-side gate for the profile values kept in customer.metadata on
 * POST /store/customers/me (profile page and checkout profile prompt both
 * write through that core route): business_email must not be a free-mail
 * domain, linkedin_url must be a LinkedIn address. Only *changed* values
 * are checked, so a legacy value saved before a rule existed doesn't block
 * unrelated updates (the forms resend the whole metadata object).
 */
export async function validateCustomerMetadataMiddleware(
  req: MedusaRequest<{ metadata?: Record<string, unknown> | null }>,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const metadata = req.body?.metadata
  if (!metadata) {
    return next()
  }

  const customerId = (req as any).auth_context?.actor_id
  const stored = customerId
    ? (await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(customerId)).metadata ?? {}
    : {}
  const changed = (key: string) =>
    typeof metadata[key] === "string" && metadata[key] !== "" && metadata[key] !== stored[key]

  if (changed("business_email")) {
    const businessEmail = metadata.business_email as string
    const error = validateBusinessEmail(businessEmail)
    if (error) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
    }
    metadata.business_email = businessEmail.trim().toLowerCase()
  }

  if (changed("linkedin_url")) {
    const url = normalizeLinkedinUrl(metadata.linkedin_url as string)
    if (!url) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Lütfen geçerli bir LinkedIn profil adresi girin (ör. linkedin.com/in/adiniz)"
      )
    }
    metadata.linkedin_url = url
  }

  next()
}
