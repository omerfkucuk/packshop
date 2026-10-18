import { Module } from "@medusajs/framework/utils"
import CrmLinkModuleService from "./services/crm-link-module-service"

export const CRM_LINK_MODULE = "crm_link"

export default Module(CRM_LINK_MODULE, {
  service: CrmLinkModuleService,
})
