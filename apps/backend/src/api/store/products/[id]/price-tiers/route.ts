import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type PriceRow = {
  min_quantity: number | null
  max_quantity: number | null
  price_list_id: string | null
}

// The Store API's normal /store/products endpoint only ever computes the
// qty=1 price - there's no query param for "price at quantity N". Quantity
// price-list tiers (min_quantity/max_quantity) only get matched by the
// Pricing module's calculatePrices() when a `quantity` is passed in its own
// context, so a real per-tier price needs a direct call to that module.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const variantId = req.query.variant_id as string | undefined
  const currencyCode = req.query.currency_code as string | undefined

  if (!variantId || !currencyCode) {
    res.status(400).json({ message: "variant_id and currency_code are required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "variant",
    filters: { id: variantId },
    fields: [
      "id",
      "price_set.id",
      "price_set.prices.min_quantity",
      "price_set.prices.max_quantity",
      "price_set.prices.price_list_id",
    ],
  })

  const priceSet = variants[0]?.price_set

  if (!priceSet?.id) {
    res.json({ tiers: [] })
    return
  }

  const breakpoints = Array.from(
    new Set(
      ((priceSet.prices ?? []) as PriceRow[])
        .filter((p) => !!p.price_list_id && p.min_quantity != null)
        .map((p) => p.min_quantity as number)
    )
  ).sort((a, b) => a - b)

  const quantities = [1, ...breakpoints]

  const pricingModuleService = req.scope.resolve(Modules.PRICING)

  const tiers = await Promise.all(
    quantities.map(async (quantity) => {
      const [calculated] = await pricingModuleService.calculatePrices(
        { id: [priceSet.id] },
        { context: { currency_code: currencyCode, quantity } }
      )

      return {
        quantity,
        unit_price: calculated?.calculated_amount ?? null,
      }
    })
  )

  res.json({ tiers: tiers.filter((t) => t.unit_price != null) })
}
