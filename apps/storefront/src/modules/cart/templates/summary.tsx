"use client"

import { HttpTypes } from "@medusajs/types"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOption[]
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart, shippingOptions }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-5 rounded-xl bg-black/[0.04] p-6 small:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-black">Sipariş özeti</h2>
      <CartTotals totals={cart} />
      <ShippingPriceNudge variant="inline" cart={cart} shippingOptions={shippingOptions} />
      <DiscountCode cart={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        className="flex h-12 w-full items-center justify-center rounded-full bg-black text-base font-medium text-white hover:bg-black/85 transition-colors"
        data-testid="checkout-button"
      >
        Ödemeye geç
      </LocalizedClientLink>
      <LocalizedClientLink
        href="/teklif"
        className="text-center text-sm text-black underline underline-offset-4 hover:no-underline"
        data-testid="quote-link"
      >
        Teklif PDF'i indir
      </LocalizedClientLink>
      <p className="text-xs text-black/50 text-center">
        Kurumsal siparişlerde faturanız Firma bilgileri sayfanızdaki bilgilerle düzenlenir.
      </p>
    </div>
  )
}

export default Summary
