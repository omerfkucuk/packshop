"use client"

import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react"
import useToggleState from "@lib/hooks/use-toggle-state"
import { ArrowRightMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MenuIcon from "@modules/common/icons/menu"
import { Text, clx } from "@modules/common/components/ui"
import { Fragment } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { Locale } from "@lib/data/locales"

const SideMenuItems = {
  Tasarla: "/tasarla",
  Keşfet: "/kesfet",
  "İşini Büyüt": "/isini-buyut",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories: HttpTypes.StoreProductCategory[] | null
}

const SideMenu = ({
  regions,
  locales,
  currentLocale,
  categories,
}: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  const topLevelCategories = categories?.filter((c) => !c.parent_category) ?? []

  return (
    <Popover className="relative h-full flex items-center">
      <PopoverButton
        data-testid="nav-menu-button"
        className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-black/[0.04] transition-colors"
      >
        <MenuIcon />
      </PopoverButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel
          className="absolute top-[calc(100%+8px)] left-0 w-80 max-h-[80vh] overflow-y-auto rounded-lg border border-black/10 bg-white shadow-sm p-2 z-50"
          data-testid="nav-menu-popup"
        >
          {({ close }) => (
            <>
              <LocalizedClientLink
                href="/store"
                onClick={close}
                className="flex items-center rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
                data-testid="nav-products-button"
              >
                Tüm Ürünler
              </LocalizedClientLink>

              {topLevelCategories.map((category) => (
                <LocalizedClientLink
                  key={category.id}
                  href={`/categories/${category.handle}`}
                  onClick={close}
                  className="flex items-center rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
                >
                  {category.name}
                </LocalizedClientLink>
              ))}

              <div className="my-2 border-t border-black/10" />

              {Object.entries(SideMenuItems).map(([name, href]) => (
                <LocalizedClientLink
                  key={name}
                  href={href}
                  onClick={close}
                  className="flex items-center rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
                  data-testid={`${name.toLowerCase()}-link`}
                >
                  {name}
                </LocalizedClientLink>
              ))}

              <div className="my-2 border-t border-black/10" />

              <div className="flex flex-col gap-y-1 px-1">
                {!!locales?.length && (
                  <div
                    className="flex justify-between items-center rounded-lg px-2 py-2"
                    onMouseEnter={languageToggleState.open}
                    onMouseLeave={languageToggleState.close}
                  >
                    <LanguageSelect
                      toggleState={languageToggleState}
                      locales={locales}
                      currentLocale={currentLocale}
                    />
                    <ArrowRightMini
                      className={clx(
                        "transition-transform duration-150",
                        languageToggleState.state ? "-rotate-90" : ""
                      )}
                    />
                  </div>
                )}
                <div
                  className="flex justify-between items-center rounded-lg px-2 py-2"
                  onMouseEnter={countryToggleState.open}
                  onMouseLeave={countryToggleState.close}
                >
                  {regions && (
                    <CountrySelect
                      toggleState={countryToggleState}
                      regions={regions}
                    />
                  )}
                  <ArrowRightMini
                    className={clx(
                      "transition-transform duration-150",
                      countryToggleState.state ? "-rotate-90" : ""
                    )}
                  />
                </div>
                <Text className="px-2 pt-2 txt-compact-small text-ui-fg-subtle">
                  © {new Date().getFullYear()} Packshop. Tüm hakları saklıdır.
                </Text>
              </div>
            </>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}

export default SideMenu
