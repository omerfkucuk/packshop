"use client"

import { Dialog, Transition } from "@headlessui/react"
import { Fragment, useEffect, useState } from "react"

import { ChevronDownMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import X from "@modules/common/icons/x"
import Thumbnail from "@modules/products/components/thumbnail"
import { getProductPrice } from "@lib/util/get-product-price"

import { optionsAsKeymap } from "./index"

type Props = {
  product: HttpTypes.StoreProduct
  option: HttpTypes.StoreProductOption
  current?: string
  updateOption: (optionId: string, value: string) => void
  disabled?: boolean
  "data-testid"?: string
}

// Packhelp-style size picker: a trigger button that opens a modal listing
// each size next to its price, instead of a row of plain pill buttons.
const SizeSelectModal = ({
  product,
  option,
  current,
  updateOption,
  disabled,
  "data-testid": dataTestId,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(current)

  useEffect(() => {
    setPending(current)
  }, [current, open])

  const rows = (option.values ?? [])
    .map((v) => v.value)
    .filter((value): value is string => !!value)
    .map((value) => {
      const variant = product.variants?.find(
        (variant) => optionsAsKeymap(variant.options)?.[option.id] === value
      )
      const price = variant
        ? getProductPrice({ product, variantId: variant.id }).variantPrice
        : null

      return { value, price }
    })

  const handleSave = () => {
    if (pending) {
      updateOption(option.id, pending)
    }
    setOpen(false)
  }

  return (
    <>
      <div className="flex flex-col gap-y-2">
        <span className="text-sm font-semibold text-black">{option.title}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex items-center justify-between w-full border border-black/10 rounded-lg px-4 h-10 text-sm hover:border-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid={dataTestId}
        >
          <span className="font-medium text-black">{current ?? "Seçin"}</span>
          <ChevronDownMini className="text-black/50" />
        </button>
      </div>

      <Transition appear show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[75]"
          onClose={() => setOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ui-bg-overlay" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="bg-ui-bg-base rounded-lg overflow-hidden w-full max-w-3xl grid grid-cols-1 small:grid-cols-2 max-h-[85vh]"
                data-testid="size-select-modal"
              >
                <div className="hidden small:block bg-ui-bg-subtle">
                  <Thumbnail
                    thumbnail={product.thumbnail}
                    images={product.images}
                    size="full"
                    className="h-full aspect-auto rounded-none"
                  />
                </div>
                <div className="flex flex-col p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-2xl font-bold text-ui-fg-base">
                      {option.title}
                    </Dialog.Title>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-ui-fg-subtle hover:text-ui-fg-base"
                      data-testid="size-select-modal-close"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="flex flex-col gap-y-2 overflow-y-auto">
                    {rows.map((row) => (
                      <button
                        key={row.value}
                        type="button"
                        onClick={() => setPending(row.value)}
                        className={clx(
                          "flex items-center justify-between border rounded-md px-4 h-12 text-sm text-left transition-colors",
                          {
                            "border-ui-border-interactive": pending === row.value,
                            "border-ui-border-base hover:border-ui-fg-subtle":
                              pending !== row.value,
                          }
                        )}
                        data-testid="size-select-modal-option"
                      >
                        <span className="text-ui-fg-base">{row.value}</span>
                        {row.price && (
                          <span className="text-ui-fg-subtle">
                            {row.price.calculated_price}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-end pt-4 mt-4 border-t border-ui-border-base">
                    <Button
                      onClick={handleSave}
                      disabled={!pending}
                      className="w-full"
                      data-testid="size-select-modal-save"
                    >
                      Kaydet ve kapat
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default SizeSelectModal
