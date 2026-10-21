"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"
import { retrieveCustomer } from "./customer"
import medusaError from "@lib/util/medusa-error"

export const retrieveBillingAddress =
  async (): Promise<HttpTypes.StoreCustomerAddress | null> => {
    const customer = await retrieveCustomer()
    return customer?.addresses?.find((a) => a.is_default_billing) || null
  }

type BillingPatch = {
  company?: string
  address_1?: string
  city?: string
  tax_number?: string
  tax_office?: string
}

/**
 * Saves one Firma bilgileri row into the default billing address, creating
 * it on first save. Only invoice fields are asked for; contact name/phone
 * come from the profile and the country is fixed, so checkout's billing
 * form - which prefills from this address - still gets a complete record.
 * Throws with the backend message on failure.
 */
export const updateBillingFields = async (patch: BillingPatch): Promise<void> => {
  const headers = { ...(await getAuthHeaders()) }
  const customer = await retrieveCustomer()
  const existing = customer?.addresses?.find((a) => a.is_default_billing)

  const { tax_number, tax_office, ...addressFields } = patch
  const metadata = {
    ...(existing?.metadata ?? {}),
    ...(tax_number !== undefined ? { tax_number } : {}),
    ...(tax_office !== undefined ? { tax_office } : {}),
  }

  const fields = {
    first_name: customer?.first_name ?? "",
    last_name: customer?.last_name ?? "",
    phone: customer?.phone ?? "",
    country_code: "tr",
    ...addressFields,
    metadata,
  }

  if (existing) {
    await sdk.store.customer
      .updateAddress(existing.id, fields, {}, headers)
      .catch(medusaError)
  } else {
    await sdk.store.customer
      .createAddress({ ...fields, is_default_billing: true }, {}, headers)
      .catch(medusaError)
  }

  // The address is the source of truth, but Medusa admin only shows the
  // customer's own company_name (Customers list/detail) and customer
  // metadata - mirror company and tax info there so staff can see them.
  if (patch.company !== undefined || tax_number !== undefined || tax_office !== undefined) {
    await sdk.store.customer
      .update(
        {
          ...(patch.company !== undefined ? { company_name: patch.company } : {}),
          metadata: {
            ...(customer?.metadata ?? {}),
            ...(tax_number !== undefined ? { tax_number } : {}),
            ...(tax_office !== undefined ? { tax_office } : {}),
          },
        },
        {},
        headers
      )
      .catch(medusaError)
  }

  revalidateTag(await getCacheTag("customers"))
}
