import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const Block = ({ title, lines, testId }: { title: string; lines: (string | null | undefined)[]; testId?: string }) => (
  <div className="flex flex-col text-sm min-w-0" data-testid={testId}>
    <span className="mb-1 font-medium text-black">{title}</span>
    {lines.filter(Boolean).map((line, i) => (
      <span key={i} className="text-black/60 break-words">
        {line}
      </span>
    ))}
  </div>
)

// Stacks on phones, 2 columns from 512px, 4 from 1024px.
const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const ship = order.shipping_address
  const bill = order.billing_address
  const method = order.shipping_methods?.[0] as { name?: string; total?: number } | undefined
  const taxNumber = bill?.metadata?.tax_number as string | undefined
  const taxOffice = bill?.metadata?.tax_office as string | undefined

  return (
    <section>
      <h2 className="text-lg font-bold text-black mb-4">Teslimat ve fatura</h2>
      <div className="grid grid-cols-1 xsmall:grid-cols-2 small:grid-cols-4 gap-6">
        <Block
          title="Teslimat adresi"
          testId="shipping-address-summary"
          lines={[
            `${ship?.first_name ?? ""} ${ship?.last_name ?? ""}`.trim(),
            ship?.company,
            ship?.address_1,
            [ship?.postal_code, ship?.city].filter(Boolean).join(" "),
          ]}
        />
        <Block title="İletişim" testId="shipping-contact-summary" lines={[order.email, ship?.phone]} />
        <Block
          title="Kargo"
          testId="shipping-method-summary"
          lines={[
            method?.name,
            method
              ? convertToLocale({ amount: method.total ?? 0, currency_code: order.currency_code })
              : null,
          ]}
        />
        <Block
          title="Fatura"
          testId="billing-address-summary"
          lines={[
            bill?.company,
            taxNumber ? `${taxOffice ?? ""} V.D. · ${taxNumber}` : null,
            [bill?.address_1, bill?.city].filter(Boolean).join(", "),
          ]}
        />
      </div>
    </section>
  )
}

export default ShippingDetails
