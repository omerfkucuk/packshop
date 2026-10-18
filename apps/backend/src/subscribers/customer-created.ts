import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { upsertPerson } from "../lib/twenty-client"
import { CRM_LINK_MODULE } from "../modules/crm-link"
import CrmLinkModuleService from "../modules/crm-link/services/crm-link-module-service"

// Twenty CRM outages must never block customer signup, so failures here are
// only logged, never rethrown.
export default async function customerCreatedHandler({
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

    const personId = await upsertPerson({
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
    })

    // Store the id now so every later sync (customer-updated, order-placed,
    // the reverse webhook) matches by id instead of re-searching by email.
    await crmLinkService.createCrmLinks({
      customer_id: customer.id,
      twenty_person_id: personId,
    })
  } catch (error) {
    logger.error(`Failed to sync customer ${data.id} to Twenty CRM: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
