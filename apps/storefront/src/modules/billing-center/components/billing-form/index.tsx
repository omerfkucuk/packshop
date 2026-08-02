"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"

import { saveBillingAddress } from "@lib/data/billing"
import { deleteCustomerAddress } from "@lib/data/customer"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import CountrySelect from "@modules/checkout/components/country-select"
import Input from "@modules/common/components/input"
import Spinner from "@modules/common/icons/spinner"

type BillingFormProps = {
  region: HttpTypes.StoreRegion
  billingAddress: HttpTypes.StoreCustomerAddress | null
}

const BillingForm = ({ region, billingAddress }: BillingFormProps) => {
  const router = useRouter()
  const hasBillingAddress = !!billingAddress
  const [removing, setRemoving] = useState(false)

  const [formState, formAction] = useActionState(saveBillingAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const removeBillingAddress = async () => {
    if (!billingAddress) return
    setRemoving(true)
    await deleteCustomerAddress(billingAddress.id)
    setRemoving(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-y-8 max-w-2xl">
      <div className="flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          Faturalandırma Merkezi
        </h1>
        <p className="text-base text-black/70">
          Faturalarınızda kullanılacak firma unvanı ve fatura adresini buradan
          düzenleyebilirsiniz.
        </p>
        {hasBillingAddress && (
          <div className="flex items-center gap-x-4">
            <button
              type="button"
              className="text-sm text-black flex items-center gap-x-2"
              onClick={removeBillingAddress}
              data-testid="billing-delete-button"
            >
              {removing ? <Spinner /> : <Trash />}
              Sil
            </button>
          </div>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-y-6">
        {hasBillingAddress && (
          <input type="hidden" name="addressId" value={billingAddress.id} />
        )}

        <div className="grid grid-cols-2 gap-x-2">
          <Input
            label="Ad"
            name="first_name"
            required
            autoComplete="given-name"
            defaultValue={billingAddress?.first_name || undefined}
            data-testid="first-name-input"
          />
          <Input
            label="Soyad"
            name="last_name"
            required
            autoComplete="family-name"
            defaultValue={billingAddress?.last_name || undefined}
            data-testid="last-name-input"
          />
        </div>
        <Input
          label="Firma unvanı"
          name="company"
          autoComplete="organization"
          defaultValue={billingAddress?.company || undefined}
          data-testid="company-input"
        />
        <Input
          label="Adres"
          name="address_1"
          required
          autoComplete="address-line1"
          defaultValue={billingAddress?.address_1 || undefined}
          data-testid="address-1-input"
        />
        <Input
          label="Daire, kat vb."
          name="address_2"
          autoComplete="address-line2"
          defaultValue={billingAddress?.address_2 || undefined}
          data-testid="address-2-input"
        />
        <div className="grid grid-cols-[144px_1fr] gap-x-2">
          <Input
            label="Posta kodu"
            name="postal_code"
            required
            autoComplete="postal-code"
            defaultValue={billingAddress?.postal_code || undefined}
            data-testid="postal-code-input"
          />
          <Input
            label="Şehir"
            name="city"
            required
            autoComplete="locality"
            defaultValue={billingAddress?.city || undefined}
            data-testid="city-input"
          />
        </div>
        <Input
          label="Bölge"
          name="province"
          autoComplete="address-level1"
          defaultValue={billingAddress?.province || undefined}
          data-testid="state-input"
        />
        <CountrySelect
          name="country_code"
          region={region}
          required
          autoComplete="country"
          defaultValue={billingAddress?.country_code || undefined}
          data-testid="country-select"
        />
        <Input
          label="Telefon"
          name="phone"
          autoComplete="phone"
          defaultValue={billingAddress?.phone || undefined}
          data-testid="phone-input"
        />

        {formState.error && (
          <div className="text-rose-500 text-sm" data-testid="billing-error">
            {formState.error}
          </div>
        )}

        <div>
          <SubmitButton data-testid="save-button">
            {hasBillingAddress ? "Güncelle" : "Kaydet"}
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}

export default BillingForm
