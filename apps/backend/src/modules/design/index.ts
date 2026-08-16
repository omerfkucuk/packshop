import { Module } from "@medusajs/framework/utils"
import DesignModuleService from "./services/design-module-service"

export const DESIGN_MODULE = "design"

export default Module(DESIGN_MODULE, {
  service: DesignModuleService,
})
