import { HttpTypes } from "@medusajs/types"

import BillingRow from "../billing-row"

type BillingFormProps = {
  billingAddress: HttpTypes.StoreCustomerAddress | null
}

// Firma bilgileri: only what goes on an invoice, laid out like Kişisel
// bilgiler. All rows write to the customer's default billing address.
const BillingForm = ({ billingAddress }: BillingFormProps) => {
  const taxNumber = billingAddress?.metadata?.tax_number as string | undefined
  const taxOffice = billingAddress?.metadata?.tax_office as string | undefined
  const address = [billingAddress?.address_1, billingAddress?.city]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="w-full" data-testid="billing-center">
      <h1 className="text-3xl font-bold tracking-tight text-black">
        Firma bilgileri
      </h1>
      <p className="mt-2 mb-4 text-base text-black/60">
        Faturalarınızda kullanılacak bilgiler.
      </p>
      <div className="flex flex-col w-full">
        <BillingRow
          label="Firma unvanı"
          currentInfo={billingAddress?.company || undefined}
          fields={[
            {
              name: "company",
              label: "Firma unvanı",
              autoComplete: "organization",
              defaultValue: billingAddress?.company || undefined,
            },
          ]}
          data-testid="billing-company-editor"
        />
        <BillingRow
          label="Vergi dairesi"
          currentInfo={taxOffice}
          fields={[{ name: "tax_office", label: "Vergi dairesi", defaultValue: taxOffice }]}
          data-testid="billing-tax-office-editor"
        />
        <BillingRow
          label="Vergi numarası / TCKN"
          currentInfo={taxNumber}
          fields={[
            {
              name: "tax_number",
              label: "Vergi numarası / TCKN",
              inputMode: "numeric",
              pattern: "[0-9]{10,11}",
              title: "10 haneli vergi numarası veya 11 haneli T.C. kimlik numarası",
              defaultValue: taxNumber,
            },
          ]}
          data-testid="billing-tax-number-editor"
        />
        <BillingRow
          label="Fatura adresi"
          currentInfo={address || undefined}
          fields={[
            {
              name: "address_1",
              label: "Açık adres (mahalle, cadde/sokak, no, ilçe)",
              autoComplete: "street-address",
              defaultValue: billingAddress?.address_1 || undefined,
            },
            {
              name: "city",
              label: "İl",
              autoComplete: "address-level1",
              defaultValue: billingAddress?.city || undefined,
            },
          ]}
          data-testid="billing-address-editor"
        />
      </div>
    </div>
  )
}

export default BillingForm
