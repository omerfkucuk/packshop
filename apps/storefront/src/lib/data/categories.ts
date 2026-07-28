import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"

// Categories are managed from the admin panel with no webhook to bust a
// long-lived cache, so `force-cache` here meant "stuck forever" - new/renamed
// categories (e.g. in the footer nav) never showed up without a code change.
// A short revalidation window keeps this fast without going stale.
const CATEGORY_REVALIDATE_SECONDS = 60

export const listCategories = async (query?: Record<string, unknown>) => {
  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        next: { revalidate: CATEGORY_REVALIDATE_SECONDS },
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *category_children.products, *products",
          handle,
        },
        next: { revalidate: CATEGORY_REVALIDATE_SECONDS },
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
