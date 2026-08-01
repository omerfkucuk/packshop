import { model } from "@medusajs/framework/utils"

const Brand = model.define("Brand", {
  id: model.id({ prefix: "brand" }).primaryKey(),
  customer_id: model.text().index("IDX_BRAND_CUSTOMER_ID"),
  company_name: model.text().nullable(),
  brand_name: model.text(),
  slogan: model.text().nullable(),
  colors: model.array().nullable(),
  heading_font: model.text().nullable(),
  body_font: model.text().nullable(),
  instagram_url: model.text().nullable(),
  facebook_url: model.text().nullable(),
  twitter_url: model.text().nullable(),
  tiktok_url: model.text().nullable(),
  website_url: model.text().nullable(),
  logo_url: model.text().nullable(),
  alternate_logo_urls: model.array().nullable(),
  share_id: model.text().unique("IDX_BRAND_SHARE_ID"),
})

export default Brand
