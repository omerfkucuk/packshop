import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"

const ShippingAddress = ({
  customer,
  cart,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    if (address) {
      setFormData((prevState: Record<string, string>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))
    }

    if (email) {
      setFormData((prevState: Record<string, string>) => ({
        ...prevState,
        email: email,
      }))
    }
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart]) // Add cart as a dependency

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

  const singleCountry =
    countriesInRegion?.length === 1 ? countriesInRegion[0] : undefined

  return (
    <div className="flex flex-col gap-y-8">
      <section className="flex flex-col gap-y-3">
        <h3 className="text-base font-semibold text-black">İletişim</h3>
        <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
          <Input
            label="E-posta"
            name="email"
            type="email"
            title="Geçerli bir e-posta adresi girin."
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
            data-testid="shipping-email-input"
          />
          <Input
            label="Telefon"
            name="shipping_address.phone"
            type="tel"
            autoComplete="tel"
            value={formData["shipping_address.phone"]}
            onChange={handleChange}
            required
            data-testid="shipping-phone-input"
          />
        </div>
      </section>

      <section className="flex flex-col gap-y-3">
        <h3 className="text-base font-semibold text-black">Teslimat adresi</h3>
        {customer && (addressesInRegion?.length || 0) > 0 && (
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as unknown as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ad"
            name="shipping_address.first_name"
            autoComplete="given-name"
            value={formData["shipping_address.first_name"]}
            onChange={handleChange}
            required
            data-testid="shipping-first-name-input"
          />
          <Input
            label="Soyad"
            name="shipping_address.last_name"
            autoComplete="family-name"
            value={formData["shipping_address.last_name"]}
            onChange={handleChange}
            required
            data-testid="shipping-last-name-input"
          />
        </div>
        <Input
          label="Firma (isteğe bağlı)"
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        />
        <Input
          label="Açık adres (mahalle, cadde/sokak, no, ilçe)"
          name="shipping_address.address_1"
          autoComplete="street-address"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <Input
            label="İl"
            name="shipping_address.city"
            autoComplete="address-level1"
            value={formData["shipping_address.city"]}
            onChange={handleChange}
            required
            data-testid="shipping-city-input"
          />
          <Input
            label="Posta kodu"
            name="shipping_address.postal_code"
            autoComplete="postal-code"
            value={formData["shipping_address.postal_code"]}
            onChange={handleChange}
            data-testid="shipping-postal-code-input"
          />
        </div>
        {singleCountry ? (
          <input type="hidden" name="shipping_address.country_code" value={singleCountry} />
        ) : (
          <CountrySelect
            name="shipping_address.country_code"
            autoComplete="country"
            region={cart?.region}
            value={formData["shipping_address.country_code"]}
            onChange={handleChange}
            required
            data-testid="shipping-country-select"
          />
        )}
      </section>
    </div>
  )
}

export default ShippingAddress
