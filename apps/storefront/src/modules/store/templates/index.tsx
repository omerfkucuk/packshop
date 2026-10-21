import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  q,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  q?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className="content-container py-6 small:py-10" data-testid="category-container">
      <header className="mb-8">
        <h1
          className="text-3xl small:text-5xl font-bold tracking-tight text-black"
          data-testid="store-page-title"
        >
          {q ? `"${q}" için sonuçlar` : "Tüm ürünler"}
        </h1>
      </header>
      <div className="flex flex-col small:flex-row small:items-start">
        <RefinementList sortBy={sort} variant="sidebar" />
        <div className="w-full min-w-0">
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
              q={q}
              showToolbar
              toolbarStart={<RefinementList variant="mobile" />}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
