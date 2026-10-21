import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createOrderOpportunity, personEmails, upsertPerson } from "../lib/twenty-client"
import { syncCompanyFromAddress } from "../lib/sync-company-from-address"
import { CRM_LINK_MODULE } from "../modules/crm-link"
import CrmLinkModuleService from "../modules/crm-link/services/crm-link-module-service"

// Twenty CRM outages must never block checkout, so failures here are only
// logged, never rethrown.
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  const crmLinkService: CrmLinkModuleService = container.resolve(CRM_LINK_MODULE)

  try {
    // Query (not orderModuleService.retrieveOrder) because totals like
    // `total` are only computed when requested as fields - retrieveOrder
    // left it undefined, so every opportunity got an empty amount.
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "customer_id", "currency_code", "total", "billing_address.*"],
      filters: { id: data.id },
    })
    if (!order.email) {
      return
    }

    const customer = order.customer_id
      ? await customerModuleService.retrieveCustomer(order.customer_id)
      : undefined

    const link = order.customer_id
      ? (await crmLinkService.listCrmLinks({ customer_id: order.customer_id }))[0]
      : undefined

    const pointOfContactId = await upsertPerson(
      {
        // Registered customers send both their emails; guests only have
        // the order email.
        ...(customer ? personEmails(customer) : { email: order.email }),
        firstName: customer?.first_name,
        lastName: customer?.last_name,
        phone: customer?.phone,
      },
      link?.twenty_person_id
    )

    if (order.customer_id) {
      if (!link) {
        await crmLinkService.createCrmLinks({
          customer_id: order.customer_id,
          twenty_person_id: pointOfContactId,
        })
      } else if (link.twenty_person_id !== pointOfContactId) {
        await crmLinkService.updateCrmLinks({ id: link.id, twenty_person_id: pointOfContactId })
      }

      // Checkout-entered company/tax info only becomes available on the
      // order's billing address once the order is placed - the cart itself
      // has no event to hook into for this.
      if (order.billing_address) {
        await syncCompanyFromAddress(container, order.customer_id, order.billing_address)
      }
    }

    const companyId = order.customer_id
      ? (await crmLinkService.listCrmLinks({ customer_id: order.customer_id }))[0]
          ?.twenty_company_id
      : undefined

    await createOrderOpportunity({
      displayId: Number(order.display_id),
      total: Number(order.total),
      currencyCode: order.currency_code,
      pointOfContactId,
      companyId,
    })
  } catch (error) {
    logger.error(`Failed to sync order ${data.id} to Twenty CRM: ${error}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
