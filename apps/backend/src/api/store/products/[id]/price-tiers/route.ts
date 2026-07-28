import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type PriceRow = {
  min_quantity: number | null
  max_quantity: number | null
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
    fields: ["id", "price_set.id"],
  })

  const priceSetId = variants[0]?.price_set?.id

  if (!priceSetId) {
    res.json({ tiers: [] })
    return
  }

  const pricingModuleService = req.scope.resolve(Modules.PRICING)

  // Both query.graph's "prices" relation AND the Pricing module's own default
  // config exclude price-list prices when loading a price set's "prices"
  // relation - PricingModuleService.normalizePriceSetConfig() defaults
  // `options.populateWhere: { prices: { price_list_id: null } }`. Overriding
  // that with an empty populateWhere is what actually surfaces every price
  // row, tiers included. Only quantity-tier prices ever carry a min_quantity
  // in this store's data model (the default price never does), so that alone
  // identifies them once they're visible.
  const priceSet = await pricingModuleService.retrievePriceSet(priceSetId, {
    relations: ["prices"],
    options: { populateWhere: {} },
  })

  const breakpoints = Array.from(
    new Set(
      ((priceSet.prices ?? []) as PriceRow[])
        .filter((p) => p.min_quantity != null)
        .map((p) => p.min_quantity as number)
    )
  ).sort((a, b) => a - b)

  const quantities = [1, ...breakpoints]

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
