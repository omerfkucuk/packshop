import { createCustomerAddressesWorkflow, updateCustomerAddressesWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncCompanyFromAddress } from "../../lib/sync-company-from-address"

// The account's saved billing address (as opposed to the checkout's
// cart.billing_address, which has no equivalent hook - see order-placed
// subscriber for that one). Twenty CRM outages must never block saving an
// address, so failures here are only logged, never rethrown.
createCustomerAddressesWorkflow.hooks.addressesCreated(async ({ addresses }, { container }) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  for (const address of addresses) {
    if (!address.is_default_billing) continue
    try {
      await syncCompanyFromAddress(container, address.customer_id, address)
    } catch (error) {
      logger.error(`Failed to sync company for address ${address.id} to Twenty CRM: ${error}`)
    }
  }
})

updateCustomerAddressesWorkflow.hooks.addressesUpdated(async ({ addresses }, { container }) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  for (const address of addresses) {
    if (!address.is_default_billing) continue
    try {
      await syncCompanyFromAddress(container, address.customer_id, address)
    } catch (error) {
      logger.error(`Failed to sync company for address ${address.id} to Twenty CRM: ${error}`)
    }
  }
})
