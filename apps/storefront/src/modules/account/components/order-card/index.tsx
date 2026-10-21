import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { fulfillmentLabel } from "@modules/order/components/order-details"
import Thumbnail from "@modules/products/components/thumbnail"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

// Whole card links to the order; small thumbnails keep it compact on phones.
const OrderCard = ({ order }: OrderCardProps) => {
  const items = order.items ?? []
  const totalUnits = items.reduce((acc, item) => acc + item.quantity, 0)
  const shown = items.slice(0, 4)

  return (
    <LocalizedClientLink
      href={`/account/orders/details/${order.id}`}
      className="block rounded-xl border border-black/10 p-4 small:p-5 hover:border-black/25 transition-colors"
      data-testid="order-card"
    >
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col min-w-0">
          <span className="text-base font-semibold text-black">
            Sipariş #<span data-testid="order-display-id">{order.display_id}</span>
          </span>
          <span className="text-sm text-black/60" data-testid="order-created-at">
            {new Date(order.created_at).toLocaleDateString("tr-TR")} · {totalUnits} adet
          </span>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-base font-semibold text-black whitespace-nowrap" data-testid="order-amount">
            {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
          </span>
          <span className="mt-0.5 rounded-full bg-black/[0.06] px-2 py-0.5 text-xs text-black/70">
            {fulfillmentLabel(order)}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-x-3">
        <div className="flex items-center gap-x-2 min-w-0">
          {shown.map((i) => (
            <div
              key={i.id}
              className="w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-black/[0.04]"
              title={`${i.title} × ${i.quantity}`}
              data-testid="order-item"
            >
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="square" />
            </div>
          ))}
          {items.length > shown.length && (
            <span className="text-sm text-black/60 whitespace-nowrap">+{items.length - shown.length}</span>
          )}
        </div>
        <span className="flex items-center gap-x-1 text-sm text-black/60 shrink-0" data-testid="order-details-link">
          Detay
          <ChevronDown className="-rotate-90" />
        </span>
      </div>
    </LocalizedClientLink>
  )
}

export default OrderCard
