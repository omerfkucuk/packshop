"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"
import { retrieveCustomer } from "./customer"

export const retrieveBillingAddress =
  async (): Promise<HttpTypes.StoreCustomerAddress | null> => {
    const customer = await retrieveCustomer()
    return customer?.addresses?.find((a) => a.is_default_billing) || null
  }

type BillingFormState = { success: boolean; error: string | null }

export const saveBillingAddress = async (
  _currentState: BillingFormState,
  formData: FormData
): Promise<BillingFormState> => {
  const addressId = formData.get("addressId") as string
  const headers = { ...(await getAuthHeaders()) }

  // The form only asks for what goes on an invoice (company, tax info,
  // address, city). Contact name/phone come from the profile and the
  // country is fixed, so checkout's billing form - which prefills from this
  // address - still gets a complete record.
  const customer = await retrieveCustomer()

  const fields = {
    first_name: customer?.first_name ?? "",
    last_name: customer?.last_name ?? "",
    phone: customer?.phone ?? "",
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    city: formData.get("city") as string,
    country_code: "tr",
    metadata: {
      tax_number: formData.get("metadata.tax_number") as string,
      tax_office: formData.get("metadata.tax_office") as string,
    },
  }

  try {
    if (addressId) {
      await sdk.store.customer.updateAddress(addressId, fields, {}, headers)
    } else {
      await sdk.store.customer.createAddress(
        { ...fields, is_default_billing: true },
        {},
        headers
      )
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return { success: true, error: null }
}
