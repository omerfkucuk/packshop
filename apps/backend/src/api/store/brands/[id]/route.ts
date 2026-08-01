import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/services/brand-module-service"

type UpdateBrandBody = {
  company_name?: string
  brand_name?: string
  slogan?: string
  colors?: string[]
  heading_font?: string
  body_font?: string
  instagram_url?: string
  facebook_url?: string
  twitter_url?: string
  tiktok_url?: string
  website_url?: string
}

// Both the id-not-found and not-your-brand cases return the same 404 - the
// route never confirms to a caller whether a given id exists at all if it
// isn't theirs.
async function retrieveOwnBrand(
  brandModuleService: BrandModuleService,
  id: string,
  customerId: string
) {
  const brand = await brandModuleService.retrieveBrand(id).catch(() => null)

  if (!brand || brand.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Brand with id ${id} not found`)
  }

  return brand
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const brand = await retrieveOwnBrand(brandModuleService, req.params.id, customerId)

  res.json({ brand })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const body = req.body as UpdateBrandBody

  await retrieveOwnBrand(brandModuleService, req.params.id, customerId)

  const brand = await brandModuleService.updateBrands({
    id: req.params.id,
    ...body,
  })

  res.json({ brand })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  await retrieveOwnBrand(brandModuleService, req.params.id, customerId)
  await brandModuleService.deleteBrands([req.params.id])

  res.json({ id: req.params.id, object: "brand", deleted: true })
}
