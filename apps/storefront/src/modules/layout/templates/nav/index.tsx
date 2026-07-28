import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { StoreRegion } from "@medusajs/types"
import { User } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import ProductsSidebar from "@modules/layout/components/products-sidebar"
import SearchBar from "@modules/layout/components/search-bar"

export default async function Nav() {
  const [regions, locales, currentLocale, categories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listCategories().catch(() => null),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group bg-white">
      <header className="relative mx-auto border-b duration-200 bg-white border-black/10">
        <div className="content-container flex items-center justify-between h-16 gap-x-6">
          <div className="flex items-center gap-x-4 h-full">
            <div className="h-full small:hidden">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>

            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus font-bold hover:text-ui-fg-base uppercase tracking-tight whitespace-nowrap"
              data-testid="nav-store-link"
            >
              Packshop
            </LocalizedClientLink>
          </div>

          <SearchBar />

          <div className="flex items-center gap-x-2 h-full">
            <div className="hidden small:flex items-center h-full">
              <LocalizedClientLink
                className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-black/[0.04] transition-colors"
                href="/account"
                data-testid="nav-account-link"
              >
                <User />
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:bg-black/[0.04] transition-colors rounded-lg h-10 px-3 flex items-center gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Sepet (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>

        <div className="hidden small:block border-t border-black/10">
          <div className="content-container flex items-center gap-x-1 h-12 txt-compact-small-plus text-ui-fg-subtle">
            <ProductsSidebar categories={categories} />
            <LocalizedClientLink
              href="/tasarla"
              className="h-8 flex items-center rounded-lg px-3 uppercase tracking-wide hover:bg-black/[0.04] hover:text-ui-fg-base transition-colors"
            >
              Tasarla
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/kesfet"
              className="h-8 flex items-center rounded-lg px-3 uppercase tracking-wide hover:bg-black/[0.04] hover:text-ui-fg-base transition-colors"
            >
              Keşfet
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/isini-buyut"
              className="h-8 flex items-center rounded-lg px-3 uppercase tracking-wide hover:bg-black/[0.04] hover:text-ui-fg-base transition-colors"
            >
              İşini Büyüt
            </LocalizedClientLink>
          </div>
        </div>
      </header>
    </div>
  )
}
