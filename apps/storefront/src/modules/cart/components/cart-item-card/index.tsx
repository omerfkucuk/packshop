"use client"

import { useEffect, useState } from "react"

import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"

type CartItemCardProps = {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
}

// Same endpoint the product page's QuantityTiers uses - packaging is sold in
// tier quantities (100, 250, ...), so the cart offers those, not 1-10.
function useTierQuantities(productId?: string, variantId?: string, currencyCode?: string) {
  const [quantities, setQuantities] = useState<number[] | null>(null)

  useEffect(() => {
    if (!productId || !variantId || !currencyCode) {
      return
    }
    let cancelled = false
    sdk.client
      .fetch<{ tiers: { quantity: number }[] }>(`/store/products/${productId}/price-tiers`, {
        method: "GET",
        query: { variant_id: variantId, currency_code: currencyCode },
      })
      .then(({ tiers }) => {
        if (!cancelled) setQuantities(tiers.length > 1 ? tiers.map((t) => t.quantity) : [])
      })
      .catch(() => {
        if (!cancelled) setQuantities([])
      })
    return () => {
      cancelled = true
    }
  }, [productId, variantId, currencyCode])

  return quantities
}

const CartItemCard = ({ item, currencyCode }: CartItemCardProps) => {
  const [updating, setUpdating] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tierQuantities = useTierQuantities(item.product_id ?? undefined, item.variant_id ?? undefined, currencyCode)
  const quantityOptions = Array.from(
    new Set([
      ...(tierQuantities && tierQuantities.length > 0
        ? tierQuantities
        : Array.from({ length: 10 }, (_, i) => i + 1)),
      item.quantity,
    ])
  ).sort((a, b) => a - b)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)
    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => setError(err.message))
      .finally(() => setUpdating(false))
  }

  const remove = async () => {
    setRemoving(true)
    await deleteLineItem(item.id).catch((err) => {
      setError(err.message)
      setRemoving(false)
    })
  }

  const options =
    item.variant?.options
      ?.filter((o) => o.option?.title && o.value)
      .map((o) => `${o.option!.title}: ${o.value}`) ?? []

  const metadata = item.metadata ?? {}
  const customSize = metadata.custom_size
    ? `${metadata.custom_width_cm} × ${metadata.custom_height_cm} × ${metadata.custom_depth_cm} cm`
    : null

  return (
    <div
      className="rounded-xl border border-black/10 bg-white p-5 small:p-8"
      data-testid="product-row"
    >
      <div className="flex gap-x-4 small:gap-x-8">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="w-20 small:w-36 shrink-0 self-start overflow-hidden rounded-lg bg-black/[0.04]"
        >
          <Thumbnail thumbnail={item.thumbnail} images={item.product?.images} size="square" />
        </LocalizedClientLink>

        <div className="flex flex-1 flex-col small:flex-row small:items-start gap-4 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg small:text-xl font-semibold text-black" data-testid="product-title">
              {item.product_title}
            </h3>
            <ul className="mt-2 flex flex-col gap-y-0.5 text-sm text-black/70" data-testid="product-variant">
              {options.length > 0 ? (
                options.map((o) => <li key={o}>{o}</li>)
              ) : (
                <li>{item.variant_title || item.variant?.title}</li>
              )}
              {customSize && <li>Özel ölçü: {customSize}</li>}
            </ul>
          </div>

          <div className="flex items-center justify-between small:justify-end gap-x-6">
            <div className="flex items-center gap-x-2">
              <select
                value={item.quantity}
                onChange={(e) => changeQuantity(parseInt(e.target.value))}
                disabled={updating}
                className="h-12 min-w-[110px] rounded-lg border border-black/15 bg-white px-4 text-base text-black focus:outline-none focus:border-black"
                aria-label="Adet"
                data-testid="product-select-button"
              >
                {quantityOptions.map((q) => (
                  <option key={q} value={q}>
                    {q} adet
                  </option>
                ))}
              </select>
              {updating && <Spinner />}
            </div>
            <span className="text-lg font-semibold text-black whitespace-nowrap">
              <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 small:ml-44 flex flex-col">
        {customSize && (
          <div className="flex items-center justify-between border-t border-black/10 py-4 text-sm">
            <span className="text-black/60">
              Fiyat <span className="text-black font-medium">ekibimiz tarafından teyit edilecek</span>
            </span>
          </div>
        )}
        <div className="flex items-center justify-end border-t border-black/10 pt-4">
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="flex items-center gap-x-2 text-sm text-black underline underline-offset-4 hover:no-underline"
            data-testid="product-delete-button"
          >
            {removing && <Spinner />}
            Kaldır
          </button>
        </div>
        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>
    </div>
  )
}

export default CartItemCard
