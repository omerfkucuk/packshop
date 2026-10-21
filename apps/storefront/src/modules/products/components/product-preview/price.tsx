import { clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      {price.price_type === "sale" && (
        <span className="line-through text-black/40" data-testid="original-price">
          {price.original_price}
        </span>
      )}
      <span
        className={clx("font-semibold text-black", {
          "text-red-600": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </span>
      <span className="text-xs text-black/50">/ adet</span>
    </span>
  )
}
