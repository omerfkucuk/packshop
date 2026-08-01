import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { setAuthAppMetadataWorkflow } from "@medusajs/core-flows"
import { verifyGoogleIdToken } from "../../../../../utils/verify-google-id-token"

// The `google-one-tap` auth provider creates a *new*, unlinked auth identity
// the first time a given Google account is seen - fine for a brand-new
// visitor, but if that Google account's email already belongs to an
// existing customer (e.g. they originally signed up with a password, or
// with the "google" OAuth button instead), `POST /store/customers` rejects
// the create with "already has an account" and the storefront has no way to
// finish logging them in. This route links the just-created identity to
// that existing customer instead, so the frontend can retry
// `sdk.auth.refresh()` and get back a token with `actor_id` populated.
//
// Re-verifies the ID token itself rather than trusting a client-supplied
// email/provider - only a request that can prove (via Google's signature)
// it owns that Google account gets to trigger a link.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const idToken = (req.body as { id_token?: string })?.id_token
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!idToken || !clientId) {
    res.status(400).json({ linked: false, message: "id_token is required" })
    return
  }

  let payload
  try {
    payload = await verifyGoogleIdToken(idToken, clientId)
  } catch (error: any) {
    res.status(401).json({ linked: false, message: error.message })
    return
  }

  if (!payload.email_verified || !payload.email) {
    res.status(400).json({ linked: false, message: "Email not verified" })
    return
  }

  const authModuleService = req.scope.resolve(Modules.AUTH)

  const [authIdentity] = await authModuleService.listAuthIdentities({
    provider_identities: { provider: "google-one-tap", entity_id: payload.sub },
  })

  if (!authIdentity) {
    res.json({ linked: false, message: "No matching auth identity" })
    return
  }

  if (authIdentity.app_metadata?.customer_id) {
    // Already linked (e.g. a retry) - nothing to do.
    res.json({ linked: true })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    filters: { email: payload.email },
    fields: ["id"],
  })

  const existingCustomer = customers[0]

  if (!existingCustomer) {
    res.json({ linked: false, message: "No existing customer with this email" })
    return
  }

  await setAuthAppMetadataWorkflow(req.scope).run({
    input: {
      authIdentityId: authIdentity.id,
      actorType: "customer",
      value: existingCustomer.id,
    },
  })

  res.json({ linked: true })
}
