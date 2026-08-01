import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/services/brand-module-service"

// Public, unauthenticated - anyone with the link can view a brand kit. Only
// ever returns fields that are meant to be shown to a stranger: no id,
// customer_id, or share_id in the response.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const [brand] = await brandModuleService.listBrands({
    share_id: req.params.shareId,
  })

  if (!brand) {
    res.status(404).json({ message: "Brand not found" })
    return
  }

  res.json({
    brand: {
      company_name: brand.company_name,
      brand_name: brand.brand_name,
      slogan: brand.slogan,
      colors: brand.colors,
      heading_font: brand.heading_font,
      body_font: brand.body_font,
      instagram_url: brand.instagram_url,
      facebook_url: brand.facebook_url,
      twitter_url: brand.twitter_url,
      tiktok_url: brand.tiktok_url,
      website_url: brand.website_url,
      logo_url: brand.logo_url,
      alternate_logo_urls: brand.alternate_logo_urls,
    },
  })
}
