"use client"

import { useEffect, useState } from "react"

import { sdk } from "@lib/config"
import { convertToLocale } from "@lib/util/money"
import { clx } from "@modules/common/components/ui"

type Tier = {
  quantity: number
  unit_price: number
}

type Props = {
  productId: string
  variantId?: string
  currencyCode: string
  onQuantityChange: (quantity: number) => void
}

// Only renders once a variant is selected and that variant actually has
// quantity price-list tiers (min_quantity/max_quantity) - products without
// one just keep the plain single price, this never shows a 1-row table.
const QuantityTiers = ({
  productId,
  variantId,
  currencyCode,
  onQuantityChange,
}: Props) => {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null)

  useEffect(() => {
    if (!variantId) {
      setTiers([])
      return
    }

    let cancelled = false

    sdk.client
      .fetch<{ tiers: Tier[] }>(`/store/products/${productId}/price-tiers`, {
        method: "GET",
        query: { variant_id: variantId, currency_code: currencyCode },
      })
      .then(({ tiers: fetchedTiers }) => {
        if (cancelled) {
          return
        }

        setTiers(fetchedTiers)

        if (fetchedTiers.length > 1) {
          setSelectedQuantity(fetchedTiers[0].quantity)
          onQuantityChange(fetchedTiers[0].quantity)
        } else {
          setSelectedQuantity(null)
          onQuantityChange(1)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTiers([])
          setSelectedQuantity(null)
          onQuantityChange(1)
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, productId, currencyCode])

  if (tiers.length <= 1) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-sm text-ui-fg-subtle">Adet</span>
      <div className="flex flex-col gap-y-2" data-testid="quantity-tiers">
        {tiers.map((tier) => (
          <button
            key={tier.quantity}
            type="button"
            onClick={() => {
              setSelectedQuantity(tier.quantity)
              onQuantityChange(tier.quantity)
            }}
            className={clx(
              "flex items-center justify-between border rounded-md px-4 h-12 text-left transition-colors",
              {
                "border-ui-border-interactive":
                  selectedQuantity === tier.quantity,
                "border-ui-border-base hover:border-ui-fg-subtle":
                  selectedQuantity !== tier.quantity,
              }
            )}
            data-testid="quantity-tier-option"
          >
            <span className="font-medium text-ui-fg-base">
              {tier.quantity}
            </span>
            <span className="text-ui-fg-subtle text-sm">
              {convertToLocale({
                amount: tier.unit_price,
                currency_code: currencyCode,
              })}
              /adet
            </span>
            <span className="font-semibold text-ui-fg-base">
              {convertToLocale({
                amount: tier.unit_price * tier.quantity,
                currency_code: currencyCode,
              })}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuantityTiers
