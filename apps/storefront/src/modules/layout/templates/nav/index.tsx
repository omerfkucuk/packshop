import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { retrieveCustomer } from "@lib/data/customer"
import { StoreRegion } from "@medusajs/types"
import { ShoppingBag } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountMenu from "@modules/layout/components/account-menu"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import SearchBar from "@modules/layout/components/search-bar"

export default async function Nav() {
  const [regions, locales, currentLocale, categories, customer] =
    await Promise.all([
      listRegions().then((regions: StoreRegion[]) => regions),
      listLocales(),
      getLocale(),
      listCategories().catch(() => null),
      retrieveCustomer().catch(() => null),
    ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group bg-white">
      <header className="relative mx-auto border-b duration-200 bg-white border-black/10">
        <div className="content-container flex items-center justify-between h-16 gap-x-6">
          <div className="flex items-center gap-x-2 h-full">
            <SideMenu
              regions={regions}
              locales={locales}
              currentLocale={currentLocale}
              categories={categories}
            />

            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus font-bold hover:text-ui-fg-base uppercase tracking-tight whitespace-nowrap"
              data-testid="nav-store-link"
            >
              Packshop
            </LocalizedClientLink>
          </div>

          <SearchBar />

          <div className="flex items-center gap-x-1 h-full">
            <div className="flex items-center h-full">
              <AccountMenu customer={customer} />
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:bg-black/[0.04] transition-colors rounded-lg h-10 w-10 flex items-center justify-center"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  <ShoppingBag />
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>
      </header>
    </div>
  )
}
