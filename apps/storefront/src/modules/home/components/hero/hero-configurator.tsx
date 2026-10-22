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
  const [variantId, setVariantId] = useState(variants[0]?.id)
  const variant = variants.find((v) => v.id === variantId) ?? variants[0]
  const [tiers, setTiers] = useState<Tier[]>([])
  const [quantity, setQuantity] = useState(1)
  const currency = variant?.calculated_price?.currency_code ?? "try"

  useEffect(() => {
    setVariantId(variants[0]?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const sizeLabel = (v: HttpTypes.StoreProductVariant) =>
    v.options?.find((o) => o.value && o.value !== "Default option value")?.value ?? v.title ?? ""
  const hasSizes = variants.length > 1 || (variant && sizeLabel(variant) !== "Default variant")

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

      <div className="relative flex flex-col gap-3">
        {/* connector between the two fields, like Uber's pickup → dropoff */}
        <span className="pointer-events-none absolute left-[23px] top-[38px] h-[44px] w-px bg-black" aria-hidden />
        <label className="relative block">
          <span className="sr-only">Ölçü</span>
          <span className="pointer-events-none absolute left-[18px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-black" aria-hidden />
          <select
            value={variant?.id}
            onChange={(e) => setVariantId(e.target.value)}
            disabled={!hasSizes}
            className={fieldClass}
            data-testid="hero-size-select"
          >
            {hasSizes ? (
              variants.map((v) => (
                <option key={v.id} value={v.id}>
                  Ölçü: {sizeLabel(v)} mm
                </option>
              ))
            ) : (
              <option>Ölçü: Standart</option>
            )}
          </select>
          {hasSizes && <Chevron />}
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
