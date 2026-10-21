import { CheckCircleSolid } from "@medusajs/icons"
import { cookies as nextCookies } from "next/headers"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import PaymentDetails from "@modules/order/components/payment-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="py-8 small:py-12">
      <div className="content-container mx-auto flex max-w-2xl flex-col gap-y-8">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div className="flex flex-col gap-y-8" data-testid="order-complete-container">
          <div className="flex flex-col items-center text-center gap-y-3">
            <CheckCircleSolid className="h-14 w-14 text-green-600" />
            <h1 className="text-2xl small:text-3xl font-bold tracking-tight text-black">
              Teşekkürler, siparişiniz alındı!
            </h1>
            <p className="text-base text-black/60">
              Sipariş onayını <span className="font-medium text-black">{order.email}</span> adresine
              gönderdik.
            </p>
          </div>

          <div className="rounded-xl border border-black/10 p-5 small:p-6">
            <OrderDetails order={order} />
          </div>

          <section className="flex flex-col gap-y-2">
            <h2 className="text-lg font-bold text-black">Ürünler</h2>
            <Items order={order} />
            <OrderSummary order={order} />
          </section>

          <ShippingDetails order={order} />
          <PaymentDetails order={order} />

          <div className="flex flex-col xsmall:flex-row gap-3">
            <LocalizedClientLink
              href="/account/orders"
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-black/85 transition-colors"
            >
              Siparişlerime git
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/"
              className="flex h-12 flex-1 items-center justify-center rounded-full border border-black/15 px-6 text-sm font-medium text-black hover:border-black/40 transition-colors"
            >
              Alışverişe devam et
            </LocalizedClientLink>
          </div>
          <Help />
        </div>
      </div>
    </div>
  )
}
