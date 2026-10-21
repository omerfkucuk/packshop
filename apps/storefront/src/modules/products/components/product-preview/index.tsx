import { getProductPrice } from "@lib/util/get-product-price"
import { isCustomProduct } from "@lib/util/product"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

// Badges come from data the team controls in Medusa admin: the "Custom" tag,
// metadata.production_days, metadata.badge (free text, e.g. "Çok satan")
// and metadata.min_quantity.
function getBadges(product: HttpTypes.StoreProduct) {
  const badges: string[] = []
  const badge = product.metadata?.badge
  if (typeof badge === "string" && badge.trim()) badges.push(badge.trim())
  if (isCustomProduct(product)) badges.push("Tasarlanabilir")
  const days = Number(product.metadata?.production_days)
  if (days > 0) badges.push(`${days} iş gününde üretim`)
  return badges
}

export default async function ProductPreview({
  product,
  isFeatured: _isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })
  const badges = getBadges(product)
  const minQuantity = Number(product.metadata?.min_quantity) || 0
  const summary = product.subtitle || product.description

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group flex h-full flex-col"
      data-testid="product-wrapper"
    >
      <div className="relative overflow-hidden rounded-xl bg-black/[0.04]">
        <div className="transition-transform duration-300 group-hover:scale-[1.03]">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            className="!border-0 !rounded-none !bg-transparent"
          />
        </div>
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-black shadow-sm"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-y-1">
        <h3
          className="text-sm small:text-base font-semibold text-black group-hover:underline underline-offset-4"
          data-testid="product-title"
        >
          {product.title}
        </h3>
        {summary && (
          <p className="text-xs small:text-sm text-black/60 line-clamp-2">{summary}</p>
        )}
        <div className="mt-auto pt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
          {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          {minQuantity > 0 && (
            <span className="text-xs text-black/50">Min. {minQuantity} adet</span>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
