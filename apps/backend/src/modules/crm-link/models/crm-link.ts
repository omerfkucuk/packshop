import { model } from "@medusajs/framework/utils"

// Maps a Packshop customer to their Twenty CRM records. Matching by id here
// (instead of re-searching Twenty by email every time) is required for
// reliable two-way sync - a salesperson could change the email in Twenty.
const CrmLink = model.define("CrmLink", {
  id: model.id({ prefix: "crmlink" }).primaryKey(),
  customer_id: model.text().unique("IDX_CRM_LINK_CUSTOMER_ID"),
  twenty_person_id: model.text().nullable(),
  twenty_company_id: model.text().nullable(),
})

export default CrmLink
