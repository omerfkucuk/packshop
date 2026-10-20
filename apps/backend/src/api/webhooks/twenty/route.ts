import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { verifyTwentyWebhookSignature } from "../../../lib/verify-twenty-webhook"
import { COMPANY_EMAIL_FIELD } from "../../../lib/twenty-client"
import { CRM_LINK_MODULE } from "../../../modules/crm-link"
import CrmLinkModuleService from "../../../modules/crm-link/services/crm-link-module-service"

// Twenty -> Packshop direction of the two-way sync. Registered manually in
// Twenty (Settings -> Developers -> Webhooks) for person.updated/
// company.updated, pointing at this route - see bodyParser.preserveRawBody
// in src/api/middlewares.ts, required for HMAC verification.
//
// NOTE: the exact top-level envelope field names (event name, record
// payload) are asserted defensively below and logged in full on anything
// unrecognized - confirm/adjust against the first real delivery once the
// webhook is registered, rather than trusting the docs' generic example.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody?.toString("utf8") ?? ""
  const signature = req.headers["x-twenty-webhook-signature"] as string | undefined
  const timestamp = req.headers["x-twenty-webhook-timestamp"] as string | undefined

  if (!verifyTwentyWebhookSignature(rawBody, timestamp, signature)) {
    res.status(401).json({ error: "invalid signature" })
    return
  }

  const body = req.body as Record<string, any>
  const eventName: string | undefined = body.event ?? body.eventName
  const record: Record<string, any> | undefined = body.data ?? body.record

  if (!eventName || !record?.id) {
    logger.warn(`Twenty webhook: unrecognized payload shape, logging raw body: ${rawBody}`)
    res.status(200).json({ received: true })
    return
  }

  const crmLinkService: CrmLinkModuleService = req.scope.resolve(CRM_LINK_MODULE)
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  try {
    if (eventName === "person.updated") {
      await handlePersonUpdated(record, crmLinkService, customerModuleService, logger)
    } else if (eventName === "company.updated") {
      await handleCompanyUpdated(record, crmLinkService, customerModuleService, logger)
    }
  } catch (error) {
    logger.error(`Failed to apply Twenty webhook (${eventName}): ${error}`)
  }

  res.status(200).json({ received: true })
}

async function handlePersonUpdated(
  record: Record<string, any>,
  crmLinkService: CrmLinkModuleService,
  customerModuleService: any,
  logger: any
) {
  const [link] = await crmLinkService.listCrmLinks({ twenty_person_id: record.id })
  if (!link) {
    return
  }

  const customer = await customerModuleService.retrieveCustomer(link.customer_id)

  const incomingPhone: string | undefined = record.phones?.primaryPhoneNumber || undefined
  // The main `emails` field is the login email and is never written back.
  const incomingBusinessEmail: string | undefined =
    record[COMPANY_EMAIL_FIELD]?.primaryEmail || undefined

  const update: Record<string, unknown> = {}
  // Diff-before-write breaks the Packshop<->Twenty loop: our own outbound
  // sync re-sends the same value, which lands here as a no-op instead of
  // triggering another round of updates.
  if (incomingPhone !== undefined && incomingPhone !== customer.phone) {
    update.phone = incomingPhone
  }
  if (
    incomingBusinessEmail !== undefined &&
    incomingBusinessEmail !== customer.metadata?.business_email
  ) {
    update.metadata = { ...customer.metadata, business_email: incomingBusinessEmail }
  }

  // Job title / LinkedIn edited by a rep in Twenty flow back into the
  // profile's metadata, merged on top of any business_email change above.
  const incomingJobTitle: string | undefined = record.jobTitle ?? undefined
  const incomingLinkedin: string | undefined = record.linkedinLink?.primaryLinkUrl ?? undefined
  const metadataPatch: Record<string, unknown> = {}
  if (incomingJobTitle !== undefined && incomingJobTitle !== (customer.metadata?.job_title ?? "")) {
    metadataPatch.job_title = incomingJobTitle
  }
  if (incomingLinkedin !== undefined && incomingLinkedin !== (customer.metadata?.linkedin_url ?? "")) {
    metadataPatch.linkedin_url = incomingLinkedin
  }
  if (Object.keys(metadataPatch).length > 0) {
    update.metadata = {
      ...((update.metadata as Record<string, unknown>) ?? customer.metadata),
      ...metadataPatch,
    }
  }

  if (Object.keys(update).length > 0) {
    await customerModuleService.updateCustomers({ id: customer.id, ...update })
  }
}

async function handleCompanyUpdated(
  record: Record<string, any>,
  crmLinkService: CrmLinkModuleService,
  customerModuleService: any,
  logger: any
) {
  const [link] = await crmLinkService.listCrmLinks({ twenty_company_id: record.id })
  if (!link) {
    return
  }

  const [billingAddress] = await customerModuleService.listCustomerAddresses({
    customer_id: link.customer_id,
    is_default_billing: true,
  })
  if (!billingAddress) {
    return
  }

  const taxNumberField = process.env.TWENTY_COMPANY_TAX_NUMBER_FIELD || "vergiNumarasi"
  const taxOfficeField = process.env.TWENTY_COMPANY_TAX_OFFICE_FIELD || "vergiDairesi"

  const update: Record<string, unknown> = {}
  if (record.name !== undefined && record.name !== billingAddress.company) {
    update.company = record.name
  }

  const incomingTaxNumber = record[taxNumberField]
  const incomingTaxOffice = record[taxOfficeField]
  const metadata = billingAddress.metadata ?? {}
  if (incomingTaxNumber !== undefined && incomingTaxNumber !== metadata.tax_number) {
    update.metadata = { ...metadata, ...(update.metadata as object), tax_number: incomingTaxNumber }
  }
  if (incomingTaxOffice !== undefined && incomingTaxOffice !== metadata.tax_office) {
    update.metadata = {
      ...metadata,
      ...(update.metadata as object),
      tax_office: incomingTaxOffice,
    }
  }

  if (Object.keys(update).length > 0) {
    await customerModuleService.updateCustomerAddresses({ id: billingAddress.id, ...update })
  }
}
