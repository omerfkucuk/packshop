import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"

// Packhelp-style category page: breadcrumb + title/description, subcategory
// chips, a full-width product grid with a count/sort bar, and a help band.
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
  const children = category.category_children ?? []

  return (
    <div className="content-container py-6 small:py-10" data-testid="category-container">
      <nav className="flex items-center flex-wrap gap-x-2 text-sm text-black/50 mb-4">
        <LocalizedClientLink href="/" className="hover:text-black">
          Ana sayfa
        </LocalizedClientLink>
        {breadcrumbParents.map((parent) => (
          <span key={parent.id} className="flex items-center gap-x-2">
            <span>/</span>
            <LocalizedClientLink
              href={`/categories/${parent.handle}`}
              className="hover:text-black"
              data-testid="sort-by-link"
            >
              {parent.name}
            </LocalizedClientLink>
          </span>
        ))}
        <span>/</span>
        <span className="text-black">{category.name}</span>
      </nav>

      <header className="mb-8 max-w-3xl">
        <h1
          className="text-3xl small:text-5xl font-bold tracking-tight text-black"
          data-testid="category-page-title"
        >
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-4 text-base small:text-lg text-black/60">{category.description}</p>
        )}
      </header>

      {children.length > 0 && (
        <div className="-mx-4 mb-8 overflow-x-auto px-4 no-scrollbar">
          <div className="flex gap-2 w-max">
            {children.map((c) => {
              const thumbnail = c.products?.[0]?.thumbnail
              return (
                <LocalizedClientLink
                  key={c.id}
                  href={`/categories/${c.handle}`}
                  className="flex items-center gap-x-2 rounded-full border border-black/15 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium text-black whitespace-nowrap hover:border-black/40 transition-colors"
                >
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/[0.06]">
                    {thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  {c.name}
                </LocalizedClientLink>
              )
            })}
          </div>
        </div>
      )}

      <Suspense
        fallback={<SkeletonProductGrid numberOfProducts={category.products?.length ?? 8} />}
      >
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={category.id}
          countryCode={countryCode}
          optionValueIds={optionValueIds}
          showToolbar
        />
      </Suspense>

      <section className="mt-16 flex flex-col small:flex-row small:items-center justify-between gap-6 rounded-2xl bg-black/[0.04] p-6 small:p-10">
        <div className="max-w-xl">
          <h2 className="text-xl small:text-2xl font-bold text-black">
            Aradığınız ölçüyü veya adedi bulamadınız mı?
          </h2>
          <p className="mt-2 text-base text-black/60">
            Tasarla&apos;da kendi ölçünüzü girin; özel ölçülü siparişlerde fiyatı ekibimiz teyit edip
            size dönüş yapar.
          </p>
        </div>
        <div className="flex flex-col xsmall:flex-row gap-3 shrink-0">
          <LocalizedClientLink
            href="/tasarla"
            className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-black/85 transition-colors"
          >
            Tasarla&apos;ya git
          </LocalizedClientLink>
        </div>
      </section>
    </div>
  )
}
