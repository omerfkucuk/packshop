import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import { convertToLocale } from "@lib/util/money"
import Thumbnail from "@modules/products/components/thumbnail"
import { HttpTypes } from "@medusajs/types"

// Same gray "Sipariş özeti" box as the cart page, with a compact item list.
const CheckoutSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const items = [...(cart.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <div className="small:sticky small:top-8 flex flex-col gap-y-5 rounded-xl bg-black/[0.04] p-6 small:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-black">Sipariş özeti</h2>
      <ul className="flex flex-col gap-y-4 max-h-[360px] overflow-y-auto" data-testid="items-table">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-x-3" data-testid="product-row">
            <div className="w-14 shrink-0 overflow-hidden rounded-lg bg-white">
              <Thumbnail thumbnail={item.thumbnail} images={item.product?.images} size="square" />
            </div>
            <div className="flex flex-1 flex-col min-w-0 text-sm">
              <span className="font-medium text-black truncate" data-testid="product-title">
                {item.product_title}
              </span>
              <span className="text-black/60 truncate">
                {item.quantity} adet · {item.variant_title}
              </span>
            </div>
            <span className="text-sm font-medium text-black whitespace-nowrap">
              {convertToLocale({ amount: item.total ?? 0, currency_code: cart.currency_code })}
            </span>
          </li>
        ))}
      </ul>
      <div className="h-px w-full bg-black/10" />
      <CartTotals totals={cart} />
      <DiscountCode cart={cart} />
    </div>
  )
}

export default CheckoutSummary
