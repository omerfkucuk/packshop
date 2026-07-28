import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NewsletterForm from "@modules/layout/components/newsletter-form"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="w-full">
      <div className="bg-ui-bg-subtle">
        <div className="content-container flex flex-col small:flex-row items-start small:items-center justify-between gap-6 py-12">
          <div>
            <h3 className="text-xl small:text-2xl font-bold">
              Kampanyalardan ilk sen haberdar ol
            </h3>
            <p className="text-ui-fg-subtle txt-small mt-1">
              Bültenimize katıl, indirim ve yeniliklerden haberdar ol.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-black/10 w-full">
        <div className="content-container flex flex-col w-full">
          <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
            <div>
              <LocalizedClientLink
                href="/"
                className="txt-compact-xlarge-plus font-bold hover:text-ui-fg-base uppercase tracking-tight"
              >
                Packshop
              </LocalizedClientLink>
            </div>
            <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
              {productCategories && productCategories?.length > 0 && (
                <div className="flex flex-col gap-y-2">
                  <span className="txt-small-plus txt-ui-fg-base">
                    Kategoriler
                  </span>
                  <ul
                    className="grid grid-cols-1 gap-2"
                    data-testid="footer-categories"
                  >
                    {productCategories?.slice(0, 6).map((c) => {
                      if (c.parent_category) {
                        return
                      }

                      const children =
                        c.category_children?.map((child) => ({
                          name: child.name,
                          handle: child.handle,
                          id: child.id,
                        })) || null

                      return (
                        <li
                          className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                          key={c.id}
                        >
                          <LocalizedClientLink
                            className="hover:text-ui-fg-base"
                            href={`/categories/${c.handle}`}
                            data-testid="category-link"
                          >
                            {c.name}
                          </LocalizedClientLink>
                          {children && (
                            <ul className="grid grid-cols-1 ml-3 gap-2">
                              {children &&
                                children.map((child) => (
                                  <li key={child.id}>
                                    <LocalizedClientLink
                                      className="hover:text-ui-fg-base"
                                      href={`/categories/${child.handle}`}
                                      data-testid="category-link"
                                    >
                                      {child.name}
                                    </LocalizedClientLink>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {collections && collections.length > 0 && (
                <div className="flex flex-col gap-y-2">
                  <span className="txt-small-plus txt-ui-fg-base">
                    Koleksiyonlar
                  </span>
                  <ul className="grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small">
                    {collections?.slice(0, 6).map((c) => (
                      <li key={c.id}>
                        <LocalizedClientLink
                          className="hover:text-ui-fg-base"
                          href={`/collections/${c.handle}`}
                        >
                          {c.title}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Yardım
                </span>
                <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                  <li>
                    <LocalizedClientLink
                      className="hover:text-ui-fg-base"
                      href="/account"
                    >
                      Hesabım
                    </LocalizedClientLink>
                  </li>
                  <li>
                    <LocalizedClientLink
                      className="hover:text-ui-fg-base"
                      href="/cart"
                    >
                      Sepetim
                    </LocalizedClientLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} Packshop. Tüm hakları saklıdır.
            </Text>
          </div>
        </div>
      </div>
    </footer>
  )
}
