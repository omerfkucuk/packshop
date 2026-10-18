import { MedusaContainer } from "@medusajs/framework"
import { CRM_LINK_MODULE } from "../modules/crm-link"
import CrmLinkModuleService from "../modules/crm-link/services/crm-link-module-service"
import { linkPersonToCompany, upsertCompany } from "./twenty-client"

type AddressLike = {
  company?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Shared by the order-placed subscriber (checkout-entered billing address)
 * and the customer-address workflow hooks (account-saved billing address) -
 * both end up with the same shape of billing address, just from different
 * Medusa workflows that don't share an event.
 */
export async function syncCompanyFromAddress(
  container: MedusaContainer,
  customerId: string,
  address: AddressLike
): Promise<void> {
  const companyName = address.company?.trim()
  if (!companyName) {
    return
  }

  const crmLinkService: CrmLinkModuleService = container.resolve(CRM_LINK_MODULE)
  const [link] = await crmLinkService.listCrmLinks({ customer_id: customerId })

  // No synced Person yet to attach the company to - customer-created will
  // create one, and the next address save/order will catch the company up.
  if (!link?.twenty_person_id) {
    return
  }

  const metadata = address.metadata ?? {}
  const taxNumber = typeof metadata.tax_number === "string" ? metadata.tax_number : undefined
  const taxOffice = typeof metadata.tax_office === "string" ? metadata.tax_office : undefined

  const companyId = await upsertCompany({
    companyId: link.twenty_company_id,
    name: companyName,
    taxNumber,
    taxOffice,
  })

  if (companyId !== link.twenty_company_id) {
    await crmLinkService.updateCrmLinks({ id: link.id, twenty_company_id: companyId })
  }

  await linkPersonToCompany(link.twenty_person_id, companyId)
}
