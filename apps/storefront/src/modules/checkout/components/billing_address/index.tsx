import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import React, { useState } from "react"
import CountrySelect from "../country-select"

const BillingAddress = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  // The cart itself only has a billing address once the customer has typed
  // one into this exact cart - fall back to their saved default billing
  // address (tax fields included) so returning customers don't have to
  // retype company/tax info they already saved on their account.
  const savedBillingAddress = customer?.addresses?.find(
    (address) => address.is_default_billing
  )
  const billingAddress = cart?.billing_address || savedBillingAddress

  const [formData, setFormData] = useState<Record<string, string>>({
    "billing_address.first_name": billingAddress?.first_name || "",
    "billing_address.last_name": billingAddress?.last_name || "",
    "billing_address.address_1": billingAddress?.address_1 || "",
    "billing_address.company": billingAddress?.company || "",
    "billing_address.postal_code": billingAddress?.postal_code || "",
    "billing_address.city": billingAddress?.city || "",
    "billing_address.country_code": billingAddress?.country_code || "",
    "billing_address.province": billingAddress?.province || "",
    "billing_address.phone": billingAddress?.phone || "",
    "billing_address.metadata.tax_number":
      (billingAddress?.metadata?.tax_number as string) || "",
    "billing_address.metadata.tax_office":
      (billingAddress?.metadata?.tax_office as string) || "",
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ad"
          name="billing_address.first_name"
          autoComplete="given-name"
          value={formData["billing_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="billing-first-name-input"
        />
        <Input
          label="Soyad"
          name="billing_address.last_name"
          autoComplete="family-name"
          value={formData["billing_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="billing-last-name-input"
        />
        <Input
          label="Açık adres"
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
        />
        <Input
          label="Firma unvanı"
          name="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="billing-company-input"
        />
        <Input
          label="Posta kodu"
          name="billing_address.postal_code"
          autoComplete="postal-code"
          value={formData["billing_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="billing-postal-input"
        />
        <Input
          label="İl"
          name="billing_address.city"
          autoComplete="address-level2"
          value={formData["billing_address.city"]}
          onChange={handleChange}
        />
        <CountrySelect
          name="billing_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["billing_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="billing-country-select"
        />
        <Input
          label="İlçe"
          name="billing_address.province"
          autoComplete="address-level1"
          value={formData["billing_address.province"]}
          onChange={handleChange}
          data-testid="billing-province-input"
        />
        <Input
          label="Telefon"
          name="billing_address.phone"
          autoComplete="tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
        />
        <Input
          label="Vergi numarası"
          name="billing_address.metadata.tax_number"
          value={formData["billing_address.metadata.tax_number"]}
          onChange={handleChange}
          data-testid="billing-tax-number-input"
        />
        <Input
          label="Vergi dairesi"
          name="billing_address.metadata.tax_office"
          value={formData["billing_address.metadata.tax_office"]}
          onChange={handleChange}
          data-testid="billing-tax-office-input"
        />
      </div>
    </>
  )
}

export default BillingAddress
