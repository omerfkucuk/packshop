"use client"

import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react"
import { useParams } from "next/navigation"
import { Fragment } from "react"

import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import { ArrowRightOnRectangle } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"

const AccountMenu = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <Popover className="relative h-full flex items-center">
      <PopoverButton
        className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-black/[0.04] transition-colors"
        data-testid="nav-account-link"
      >
        <User />
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
          className="absolute top-[calc(100%+8px)] right-0 w-72 rounded-lg border border-black/10 bg-white shadow-sm p-2 z-50"
          data-testid="nav-account-dropdown"
        >
          {customer ? (
            <>
              <div className="flex items-center gap-x-3 px-3 py-2.5">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-ui-bg-subtle shrink-0">
                  <User />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-ui-fg-base truncate">
                    {customer.first_name} {customer.last_name}
                  </span>
                  <LocalizedClientLink
                    href="/account/profile"
                    className="text-sm text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                  >
                    Hesabı yönet
                  </LocalizedClientLink>
                </div>
              </div>

              <div className="my-2 border-t border-black/10" />

              <LocalizedClientLink
                href="/account/orders"
                className="flex items-center gap-x-3 rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
              >
                <Package />
                <span>Siparişlerim</span>
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account/addresses"
                className="flex items-center gap-x-3 rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
              >
                <MapPin />
                <span>Adreslerim</span>
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account/profile"
                className="flex items-center gap-x-3 rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
              >
                <User />
                <span>Profilim</span>
              </LocalizedClientLink>

              <div className="my-2 border-t border-black/10" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-x-3 rounded-lg px-3 py-2.5 text-left hover:bg-black/[0.04] transition-colors"
                data-testid="logout-button"
              >
                <ArrowRightOnRectangle />
                <span>Çıkış yap</span>
              </button>
            </>
          ) : (
            <LocalizedClientLink
              href="/account"
              className="flex items-center gap-x-3 rounded-lg px-3 py-2.5 hover:bg-black/[0.04] transition-colors"
              data-testid="account-signin-link"
            >
              <User />
              <span>Giriş yap</span>
            </LocalizedClientLink>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}

export default AccountMenu
