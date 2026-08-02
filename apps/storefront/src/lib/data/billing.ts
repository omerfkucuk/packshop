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

  const fields = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
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
