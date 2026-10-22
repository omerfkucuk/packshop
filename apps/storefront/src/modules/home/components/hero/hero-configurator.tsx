"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { sdk } from "@lib/config"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Tier = { quantity: number; unit_price: number }

// Offered when a variant has no price-list tiers (priced per unit only).
const FALLBACK_QUANTITIES = [100, 250, 500, 1000, 2500]

const productLabel = (p: HttpTypes.StoreProduct) =>
  p.handle?.includes("zip") ? "Zip'li kargo poşeti" : "Kargo poşeti"

// Uber's pickup/dropoff form, repurposed: bag type pill, then size and
// quantity as two linked fields, a live price line and a CTA into Tasarla
// with the chosen product/variant/quantity.
const HeroConfigurator = ({ products }: { products: HttpTypes.StoreProduct[] }) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [productId, setProductId] = useState(products[0].id)
  const product = products.find((p) => p.id === productId) ?? products[0]
  const variants = product.variants ?? []

  // Option-driven selection: a "Cep" option (Cepli/Cepsiz) renders as a
  // two-way toggle, the remaining option (Ölçü) as the size field; the
  // variant is whichever matches both.
  const realOptions = (product.options ?? []).filter(
    (o) => (o.values?.length ?? 0) > 0 && o.values?.[0]?.value !== "Default option value"
  )
  const pocketOption = realOptions.find((o) => /cep/i.test(o.title ?? ""))
  const sizeOption = realOptions.find((o) => o !== pocketOption)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const valueOf = (v: HttpTypes.StoreProductVariant, optionId?: string) =>
    v.options?.find((o) => o.option_id === optionId)?.value
  const variant =
    variants.find((v) =>
      [pocketOption, sizeOption].every(
        (o) => !o || !selected[o.id] || valueOf(v, o.id) === selected[o.id]
      )
    ) ?? variants[0]
  const choose = (optionId: string, value: string) =>
    setSelected((s) => ({ ...s, [optionId]: value }))
  const [tiers, setTiers] = useState<Tier[]>([])
  const [quantity, setQuantity] = useState(1)
  const currency = variant?.calculated_price?.currency_code ?? "try"

  useEffect(() => {
    setSelected({})
  }, [productId])

  // Same tiers endpoint as the product page's quantity table.
  useEffect(() => {
    if (!variant?.id) return
    let cancelled = false
    sdk.client
      .fetch<{ tiers: Tier[] }>(`/store/products/${product.id}/price-tiers`, {
        method: "GET",
        query: { variant_id: variant.id, currency_code: currency },
      })
      .then(({ tiers }) => {
        if (cancelled) return
        // A single "tier" is just the base price - same rule as QuantityTiers.
        const real = tiers.length > 1 ? tiers : []
        setTiers(real)
        setQuantity(real[0]?.quantity ?? FALLBACK_QUANTITIES[0])
      })
      .catch(() => {
        if (cancelled) return
        setTiers([])
        setQuantity(FALLBACK_QUANTITIES[0])
      })
    return () => {
      cancelled = true
    }
  }, [product.id, variant?.id, currency])

  const unitPrice = useMemo(() => {
    const tier = [...tiers].reverse().find((t) => quantity >= t.quantity)
    return tier?.unit_price ?? variant?.calculated_price?.calculated_amount ?? null
  }, [tiers, quantity, variant])

  const sizeValues = sizeOption?.values?.map((v) => v.value).filter(Boolean) as string[] | undefined
  const pocketValues = pocketOption?.values?.map((v) => v.value).filter(Boolean) as string[] | undefined

  const start = () => {
    if (!variant) return
    router.push(
      `/${countryCode}/tasarla?product=${product.handle}&variant=${variant.id}&quantity=${quantity}`
    )
  }

  const fieldClass =
    "h-14 w-full appearance-none rounded-lg bg-black/[0.05] pl-12 pr-10 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"

  return (
    <div className="mt-8 flex max-w-md flex-col">
      {products.length > 1 && (
        <div className="relative mb-4 w-fit">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-12 appearance-none rounded-full bg-black/[0.05] pl-5 pr-10 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-black"
            aria-label="Poşet tipi"
            data-testid="hero-product-select"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      )}

      {pocketOption && pocketValues && pocketValues.length > 1 && (
        <div className="mb-4 inline-flex w-fit rounded-full bg-black/[0.05] p-1" role="radiogroup" aria-label={pocketOption.title}>
          {pocketValues.map((value) => {
            const active = (valueOf(variant, pocketOption.id) ?? pocketValues[0]) === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(pocketOption.id, value)}
                className={
                  active
                    ? "h-10 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-sm"
                    : "h-10 rounded-full px-5 text-sm font-medium text-black/60 hover:text-black"
                }
                data-testid="hero-pocket-option"
              >
                {value}
              </button>
            )
          })}
        </div>
      )}

      <div className="relative flex flex-col gap-3">
        {/* connector between the two fields, like Uber's pickup → dropoff */}
        <span className="pointer-events-none absolute left-[23px] top-[38px] h-[44px] w-px bg-black" aria-hidden />
        <label className="relative block">
          <span className="sr-only">Ölçü</span>
          <span className="pointer-events-none absolute left-[18px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-black" aria-hidden />
          <select
            value={(sizeOption && valueOf(variant, sizeOption.id)) ?? ""}
            onChange={(e) => sizeOption && choose(sizeOption.id, e.target.value)}
            disabled={!sizeValues?.length}
            className={fieldClass}
            data-testid="hero-size-select"
          >
            {sizeValues?.length ? (
              sizeValues.map((value) => (
                <option key={value} value={value}>
                  Ölçü: {value} cm
                </option>
              ))
            ) : (
              <option value="">Ölçü: Standart</option>
            )}
          </select>
          {!!sizeValues?.length && <Chevron />}
        </label>
        <label className="relative block">
          <span className="sr-only">Adet</span>
          <span className="pointer-events-none absolute left-[18px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 bg-black" aria-hidden />
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={fieldClass}
            data-testid="hero-quantity-select"
          >
            {(tiers.length ? tiers.map((t) => t.quantity) : FALLBACK_QUANTITIES).map((q) => (
              <option key={q} value={q}>
                Adet: {q.toLocaleString("tr-TR")}
              </option>
            ))}
          </select>
          <Chevron />
        </label>
      </div>

      {unitPrice != null && (
        <p className="mt-4 text-sm text-black/70" data-testid="hero-price">
          Birim fiyat{" "}
          <span className="font-semibold text-black">
            {convertToLocale({ amount: unitPrice, currency_code: currency })}
          </span>{" "}
          · Toplam{" "}
          <span className="font-semibold text-black">
            {convertToLocale({ amount: unitPrice * quantity, currency_code: currency })}
          </span>
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4">
        <button
          type="button"
          onClick={start}
          className="h-12 w-fit rounded-lg bg-black px-6 text-base font-medium text-white hover:bg-black/85 transition-colors"
          data-testid="hero-cta"
        >
          Tasarlamaya başlayın
        </button>
        <LocalizedClientLink
          href="/categories/kargo-posetleri"
          className="w-fit text-sm text-black underline underline-offset-4 hover:no-underline"
        >
          Tüm kargo poşetlerini görün
        </LocalizedClientLink>
      </div>
    </div>
  )
}

const Chevron = () => (
  <svg
    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
    width="14"
    height="14"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
  </svg>
)

export default HeroConfigurator
