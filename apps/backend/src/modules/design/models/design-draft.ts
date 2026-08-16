import { model } from "@medusajs/framework/utils"

// The current state of the Tasarla canvas for one (customer, product)
// pair - selected_elements/manual_overrides are opaque JSON blobs owned
// entirely by the storefront's own types (SelectedElement[] /
// ManualOverrides), never inspected or validated here, same as how
// resolveLayout()'s pure client-side computation already treats them as
// self-consistent input. Auto-saved, not something the customer names or
// manages directly - see docs/ai-layout-engine-architecture.md's original
// plan for a `design` module.
const DesignDraft = model.define("DesignDraft", {
  id: model.id({ prefix: "design" }).primaryKey(),
  customer_id: model.text().index("IDX_DESIGN_DRAFT_CUSTOMER_ID"),
  product_id: model.text(),
  brand_id: model.text().nullable(),
  selected_theme: model.text().nullable(),
  selected_elements: model.json(),
  manual_overrides: model.json(),
})

export default DesignDraft
