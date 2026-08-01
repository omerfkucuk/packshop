import { randomUUID } from "crypto"
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/services/brand-module-service"

type CreateBrandBody = {
  company_name?: string
  brand_name: string
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

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const brands = await brandModuleService.listBrands(
    { customer_id: customerId },
    { order: { id: "DESC" } }
  )

  res.json({ brands })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const body = req.body as CreateBrandBody

  if (!body?.brand_name) {
    res.status(400).json({ message: "brand_name is required" })
    return
  }

  const brand = await brandModuleService.createBrands({
    ...body,
    customer_id: customerId,
    share_id: randomUUID(),
  })

  res.status(201).json({ brand })
}
