import { HttpTypes } from "@medusajs/types"

import CartItemCard from "@modules/cart/components/cart-item-card"
import ClearCartButton from "@modules/cart/components/clear-cart-button"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = [...(cart.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="text-3xl small:text-4xl font-bold tracking-tight text-black">
          Sepetim{" "}
          <span className="text-black/40 font-semibold">({items.length} ürün)</span>
        </h1>
        <ClearCartButton lineIds={items.map((i) => i.id)} />
      </div>
      <div className="flex flex-col gap-y-4">
        {items.map((item) => (
          <CartItemCard key={item.id} item={item} currencyCode={cart.currency_code} />
        ))}
      </div>
    </div>
  )
}

export default ItemsTemplate
