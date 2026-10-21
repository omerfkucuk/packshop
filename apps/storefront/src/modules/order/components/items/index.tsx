import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemsProps = {
  order: HttpTypes.StoreOrder
}

// Compact item list (same pattern as the checkout summary) - a table here
// overflowed on phones.
const Items = ({ order }: ItemsProps) => {
  const items = [...(order.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <ul className="flex flex-col divide-y divide-black/10" data-testid="products-table">
      {items.map((item) => {
        const options =
          item.variant?.options
            ?.filter((o) => o.option?.title && o.value)
            .map((o) => `${o.option!.title}: ${o.value}`)
            .join(" · ") || item.variant_title
        return (
          <li key={item.id} className="flex items-center gap-x-3 py-4" data-testid="product-row">
            <div className="w-14 small:w-16 shrink-0 overflow-hidden rounded-lg bg-black/[0.04]">
              <Thumbnail thumbnail={item.thumbnail} size="square" />
            </div>
            <div className="flex flex-1 flex-col min-w-0 text-sm">
              <span className="font-medium text-black break-words" data-testid="product-name">
                {item.product_title}
              </span>
              {options && <span className="text-black/60 break-words">{options}</span>}
              <span className="text-black/60">
                <span data-testid="product-quantity">{item.quantity}</span> adet ×{" "}
                {convertToLocale({ amount: item.unit_price ?? 0, currency_code: order.currency_code })}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold text-black whitespace-nowrap">
              {convertToLocale({ amount: item.total ?? 0, currency_code: order.currency_code })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default Items
