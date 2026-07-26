import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  const breadcrumbParents = [...parents].reverse()

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        data-testid="sort-by-container"
        hideOptionsPicker
      />
      <div className="w-full">
        <nav className="flex items-center flex-wrap gap-x-2 text-sm text-ui-fg-muted mb-3">
          <LocalizedClientLink href="/store" className="hover:text-ui-fg-base">
            Mağaza
          </LocalizedClientLink>
          {breadcrumbParents.map((parent) => (
            <span key={parent.id} className="flex items-center gap-x-2">
              <span>/</span>
              <LocalizedClientLink
                href={`/categories/${parent.handle}`}
                className="hover:text-ui-fg-base"
                data-testid="sort-by-link"
              >
                {parent.name}
              </LocalizedClientLink>
            </span>
          ))}
          <span>/</span>
          <span className="text-ui-fg-base">{category.name}</span>
        </nav>
        <h1
          className="text-3xl small:text-4xl font-bold tracking-tight text-ui-fg-base mb-3"
          data-testid="category-page-title"
        >
          {category.name}
        </h1>
        {category.description && (
          <p className="text-base-regular text-ui-fg-subtle max-w-2xl mb-8">
            {category.description}
          </p>
        )}
        {category.category_children && category.category_children.length > 0 && (
          <div className="mb-10">
            <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-4">
              {category.category_children.map((c) => {
                const thumbnail = c.products?.[0]?.thumbnail

                return (
                  <LocalizedClientLink
                    key={c.id}
                    href={`/categories/${c.handle}`}
                    className="group flex flex-col gap-3"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-ui-bg-subtle">
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ui-fg-subtle text-sm text-center px-2">
                          {c.name}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-ui-fg-base">
                      {c.name}
                    </span>
                  </LocalizedClientLink>
                )
              })}
            </div>
          </div>
        )}
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
          />
        </Suspense>
      </div>
    </div>
  )
}
