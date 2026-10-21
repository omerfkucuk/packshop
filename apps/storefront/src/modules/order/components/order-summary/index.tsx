import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

// Gray totals box, same look as the cart/checkout "Sipariş özeti".
const OrderSummary = ({ order }: OrderSummaryProps) => {
  const money = (amount?: number | null) =>
    convertToLocale({ amount: amount ?? 0, currency_code: order.currency_code })

  const rows: [string, string][] = [
    ["Ara toplam", money(order.item_subtotal ?? order.subtotal)],
    ...(order.discount_total > 0 ? [["İndirim", `- ${money(order.discount_total)}`] as [string, string]] : []),
    ...(order.gift_card_total > 0 ? [["Hediye kartı", `- ${money(order.gift_card_total)}`] as [string, string]] : []),
    ["Kargo", money(order.shipping_total)],
    ["KDV", money(order.tax_total)],
  ]

  return (
    <div className="rounded-xl bg-black/[0.04] p-5 small:p-6 text-sm">
      <div className="flex flex-col gap-y-2 text-black/70">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-x-4">
            <span>{label}</span>
            <span className="whitespace-nowrap">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-x-4 border-t border-black/10 pt-4 text-base font-bold text-black">
        <span>Toplam</span>
        <span className="whitespace-nowrap" data-testid="order-total">
          {money(order.total)}
        </span>
      </div>
    </div>
  )
}

export default OrderSummary
