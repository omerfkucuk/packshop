import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import SortSelect from "@modules/store/components/sort-select"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  q?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  q,
  showToolbar = false,
  toolbarStart,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  q?: string
  /** Packhelp-style bar with the product count and a sort dropdown. */
  showToolbar?: boolean
  /** Rendered at the start of the top bar (e.g. the mobile Filtrele button). */
  toolbarStart?: React.ReactNode
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (q) {
    queryParams["q"] = q
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <>
      {showToolbar && (
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div className="flex items-center gap-x-3">
            {toolbarStart}
            <span className="text-sm text-black/60" data-testid="product-count">
              {count} ürün
            </span>
          </div>
          <SortSelect sortBy={sortBy ?? "created_at"} />
        </div>
      )}
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 large:grid-cols-4 gap-x-4 small:gap-x-6 gap-y-8 small:gap-y-10"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
