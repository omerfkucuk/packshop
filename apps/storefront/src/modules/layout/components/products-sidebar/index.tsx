"use client"

import { Fragment, useState } from "react"
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductsSidebarProps = {
  categories: HttpTypes.StoreProductCategory[] | null
}

const ProductsSidebar = ({ categories }: ProductsSidebarProps) => {
  const [open, setOpen] = useState(false)

  const topLevelCategories =
    categories?.filter((c) => !c.parent_category) ?? []

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="txt-compact-small-plus uppercase tracking-wide hover:text-ui-fg-base"
        data-testid="nav-products-button"
      >
        Ürünler
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-[60]">
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
              <DialogPanel className="h-full w-full max-w-xs sm:max-w-sm bg-white flex flex-col">
                <div className="flex items-center justify-between px-6 h-16 border-b border-ui-border-base">
                  <span className="txt-compact-large-plus uppercase tracking-wide">
                    Ürünler
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    data-testid="close-products-sidebar"
                  >
                    <XMark />
                  </button>
                </div>

                <div className="flex flex-col overflow-y-auto py-6 px-6 gap-1">
                  <LocalizedClientLink
                    href="/store"
                    onClick={() => setOpen(false)}
                    className="txt-compact-large-plus uppercase tracking-wide py-3 border-b border-ui-border-base hover:text-ui-fg-subtle"
                  >
                    Tüm Ürünler
                  </LocalizedClientLink>

                  {topLevelCategories.map((category) => (
                    <LocalizedClientLink
                      key={category.id}
                      href={`/categories/${category.handle}`}
                      onClick={() => setOpen(false)}
                      className="txt-compact-large uppercase tracking-wide py-3 border-b border-ui-border-base hover:text-ui-fg-subtle"
                    >
                      {category.name}
                    </LocalizedClientLink>
                  ))}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default ProductsSidebar
