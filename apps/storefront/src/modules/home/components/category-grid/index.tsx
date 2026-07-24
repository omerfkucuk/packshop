import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const CategoryGrid = async () => {
  const categories = await listCategories().catch(() => null)
  const topLevelCategories =
    categories?.filter((c) => !c.parent_category) ?? []

  if (!topLevelCategories.length) {
    return null
  }

  return (
    <div className="content-container py-16 small:py-24">
      <h2 className="text-2xl small:text-3xl font-bold mb-8">Kategoriler</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {topLevelCategories.map((category) => {
          const thumbnail = category.products?.[0]?.thumbnail

          return (
            <LocalizedClientLink
              key={category.id}
              href={`/categories/${category.handle}`}
              className="group flex-shrink-0 w-48 small:w-56 flex flex-col gap-3"
            >
              <div className="w-full h-56 small:h-64 rounded-lg overflow-hidden bg-ui-bg-subtle">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ui-fg-subtle text-sm">
                    {category.name}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold">{category.name}</span>
            </LocalizedClientLink>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryGrid
