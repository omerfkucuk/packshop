"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { isCustomProduct } from "@lib/util/product"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import SizeSelectModal from "@modules/products/components/product-actions/size-select-modal"
import QuantityTiers from "@modules/products/components/product-actions/quantity-tiers"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

export const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const countryCode = useParams().countryCode as string
  const didInitOptions = useRef(false)

  // Preselect the options: if there is only 1 variant, use it; otherwise
  // default to the first value of each option (the topmost row in
  // SizeSelectModal/OptionSelect) so a variant is selected on page load.
  // Guarded to run once - the effect below writes the selected variant's id
  // to the `v_id` query param, which re-triggers this Server Component with
  // a fresh `product` object (new array/object references even though nothing
  // about the options actually changed). Without the guard, that refetch
  // reran this effect and stomped the selection the user had just made back
  // to the first option, so picking a different size in the modal appeared
  // to do nothing.
  useEffect(() => {
    if (didInitOptions.current) {
      return
    }
    didInitOptions.current = true

    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
      return
    }

    if ((product.variants?.length ?? 0) > 1) {
      const defaultOptions = (product.options ?? []).reduce(
        (acc: Record<string, string>, option) => {
          const firstValue = option.values?.[0]?.value
          if (option.id && firstValue) {
            acc[option.id] = firstValue
          }
          return acc
        },
        {}
      )

      setOptions(defaultOptions)
    }
  }, [product.variants, product.options])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const isCustom = isCustomProduct(product)

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity,
      countryCode,
    })

    setIsAdding(false)
  }

  return (
    <>
      <div className="flex flex-col gap-y-5" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    {option.title === "Ölçü" ? (
                      <SizeSelectModal
                        product={product}
                        option={option}
                        current={options[option.id]}
                        updateOption={setOptionValue}
                        data-testid="product-options"
                        disabled={!!disabled || isAdding}
                      />
                    ) : (
                      <OptionSelect
                        option={option}
                        current={options[option.id]}
                        updateOption={setOptionValue}
                        title={option.title ?? ""}
                        data-testid="product-options"
                        disabled={!!disabled || isAdding}
                      />
                    )}
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        {selectedVariant && (
          <QuantityTiers
            productId={product.id}
            variantId={selectedVariant.id}
            currencyCode={region.currency_code}
            onQuantityChange={setQuantity}
          />
        )}

        <ProductPrice product={product} variant={selectedVariant} />

        <div className={isCustom ? "grid grid-cols-2 gap-x-3" : undefined}>
          <Button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            variant="primary"
            className="w-full h-10"
            isLoading={isAdding}
            data-testid="add-product-button"
          >
            {!selectedVariant && Object.keys(options).length === 0
              ? "Seçenek seçin"
              : !inStock || !isValidVariant
              ? "Stokta yok"
              : "Sepete ekle"}
          </Button>
          {isCustom && (
            <LocalizedClientLink
              href={`/tasarla?product=${product.handle}`}
              className="inline-flex items-center justify-center w-full h-10 px-4 rounded-md font-medium bg-white text-black border border-gray-200 hover:bg-gray-50 transition-colors"
              data-testid="design-product-button"
            >
              Tasarla
            </LocalizedClientLink>
          )}
        </div>
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
          isCustom={isCustom}
        />
      </div>
    </>
  )
}
