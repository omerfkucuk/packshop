import { Module } from "@medusajs/framework/utils"
import BrandModuleService from "./services/brand-module-service"

export const BRAND_MODULE = "brand"

export default Module(BRAND_MODULE, {
  service: BrandModuleService,
})
