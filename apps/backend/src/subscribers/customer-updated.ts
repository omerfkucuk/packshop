import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { personEmails, upsertPerson } from "../lib/twenty-client"
import { CRM_LINK_MODULE } from "../modules/crm-link"
import CrmLinkModuleService from "../modules/crm-link/services/crm-link-module-service"

// Twenty CRM outages must never block account edits, so failures here are
// only logged, never rethrown. Re-pushes current state unconditionally
// (not a diff) - customer.updated carries no "what changed" info, and an
// idempotent PATCH to Twenty is harmless either way.
export default async function customerUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  const crmLinkService: CrmLinkModuleService = container.resolve(CRM_LINK_MODULE)

  try {
    const customer = await customerModuleService.retrieveCustomer(data.id)
    if (!customer.email) {
      return
    }

    const [link] = await crmLinkService.listCrmLinks({ customer_id: customer.id })

    const personId = await upsertPerson(
      {
        ...personEmails(customer),
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
      },
      link?.twenty_person_id
    )

    if (!link) {
      await crmLinkService.createCrmLinks({
        customer_id: customer.id,
        twenty_person_id: personId,
      })
    } else if (link.twenty_person_id !== personId) {
      await crmLinkService.updateCrmLinks({ id: link.id, twenty_person_id: personId })
    }
  } catch (error) {
    logger.error(`Failed to sync customer ${data.id} to Twenty CRM: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "customer.updated",
}
