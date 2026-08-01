"use client"

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import useToggleState from "@lib/hooks/use-toggle-state"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MenuIcon from "@modules/common/icons/menu"
import { Text, clx } from "@modules/common/components/ui"
import { Fragment, useState } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { Locale } from "@lib/data/locales"

const SideMenuItems = {
  "Marka Merkezi": "/marka-merkezi",
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
  const [open, setOpen] = useState(false)
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  const topLevelCategories = categories?.filter((c) => !c.parent_category) ?? []

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="nav-menu-button"
        className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-black/[0.04] transition-colors"
      >
        <MenuIcon />
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={close} className="relative z-[60]">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 flex">
            <TransitionChild
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in duration-150"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <DialogPanel
                className="h-full w-full max-w-xs sm:max-w-sm bg-white flex flex-col"
                data-testid="nav-menu-popup"
              >
                <div className="flex items-center justify-between px-6 h-16 border-b border-black/10">
                  <span className="txt-compact-large-plus uppercase tracking-wide">
                    Menü
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
                    data-testid="close-menu-button"
                  >
                    <XMark />
                  </button>
                </div>

                <div className="flex flex-col overflow-y-auto py-4 px-4 flex-1">
                  <LocalizedClientLink
                    href="/store"
                    onClick={close}
                    className="flex items-center rounded-lg px-2 py-3 hover:bg-black/[0.04] transition-colors"
                    data-testid="nav-products-button"
                  >
                    Tüm Ürünler
                  </LocalizedClientLink>

                  {topLevelCategories.map((category) => (
                    <LocalizedClientLink
                      key={category.id}
                      href={`/categories/${category.handle}`}
                      onClick={close}
                      className="flex items-center rounded-lg px-2 py-3 hover:bg-black/[0.04] transition-colors"
                    >
                      {category.name}
                    </LocalizedClientLink>
                  ))}

                  <div className="my-3 border-t border-black/10" />

                  {Object.entries(SideMenuItems).map(([name, href]) => (
                    <LocalizedClientLink
                      key={name}
                      href={href}
                      onClick={close}
                      className="flex items-center rounded-lg px-2 py-3 hover:bg-black/[0.04] transition-colors"
                      data-testid={`${name.toLowerCase()}-link`}
                    >
                      {name}
                    </LocalizedClientLink>
                  ))}
                </div>

                <div className="flex flex-col gap-y-1 px-4 py-4 border-t border-black/10">
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
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default SideMenu
