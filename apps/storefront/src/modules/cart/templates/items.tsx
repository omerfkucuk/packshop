import { HttpTypes } from "@medusajs/types"

import CartItemCard from "@modules/cart/components/cart-item-card"
import ClearCartButton from "@modules/cart/components/clear-cart-button"
import { DocumentText } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = [...(cart.items ?? [])].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <div>
      <h1 className="text-3xl small:text-4xl font-bold tracking-tight text-black mb-5">
        Sepetim{" "}
        <span className="text-black/40 font-semibold">({items.length} ürün)</span>
      </h1>
      {/* Cart-level actions (Partbase-style). "Sepeti paylaş" goes here too once built. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/[0.04] p-2">
        <LocalizedClientLink
          href="/teklif"
          className="flex items-center gap-x-2 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black hover:border-black/30 transition-colors"
          data-testid="quote-link"
        >
          <DocumentText />
          Teklif PDF&apos;i indir
        </LocalizedClientLink>
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
