"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"

import { saveBillingAddress } from "@lib/data/billing"
import { deleteCustomerAddress } from "@lib/data/customer"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Spinner from "@modules/common/icons/spinner"

type BillingFormProps = {
  billingAddress: HttpTypes.StoreCustomerAddress | null
}

const BillingForm = ({ billingAddress }: BillingFormProps) => {
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
          Firma bilgileri
        </h1>
        <p className="text-base text-black/70">
          Faturalarınızda kullanılacak firma unvanı, vergi bilgileri ve fatura
          adresini buradan düzenleyebilirsiniz.
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

        <section className="flex flex-col gap-y-3">
          <h2 className="text-base font-semibold text-black">Firma</h2>
          <Input
            label="Firma unvanı"
            name="company"
            required
            autoComplete="organization"
            defaultValue={billingAddress?.company || undefined}
            data-testid="company-input"
          />
          <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
            <Input
              label="Vergi dairesi"
              name="metadata.tax_office"
              required
              defaultValue={
                (billingAddress?.metadata?.tax_office as string) || undefined
              }
              data-testid="tax-office-input"
            />
            <Input
              label="Vergi numarası / TCKN"
              name="metadata.tax_number"
              required
              inputMode="numeric"
              pattern="[0-9]{10,11}"
              title="10 haneli vergi numarası veya 11 haneli T.C. kimlik numarası"
              defaultValue={
                (billingAddress?.metadata?.tax_number as string) || undefined
              }
              data-testid="tax-number-input"
            />
          </div>
        </section>

        <section className="flex flex-col gap-y-3">
          <h2 className="text-base font-semibold text-black">Fatura adresi</h2>
          <Input
            label="Açık adres (mahalle, cadde/sokak, no, ilçe)"
            name="address_1"
            required
            autoComplete="street-address"
            defaultValue={billingAddress?.address_1 || undefined}
            data-testid="address-1-input"
          />
          <Input
            label="İl"
            name="city"
            required
            autoComplete="address-level1"
            defaultValue={billingAddress?.city || undefined}
            data-testid="city-input"
          />
        </section>

        {formState.success && !formState.error && (
          <div className="text-green-700 text-sm" data-testid="billing-success">
            Firma bilgileriniz kaydedildi.
          </div>
        )}
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
