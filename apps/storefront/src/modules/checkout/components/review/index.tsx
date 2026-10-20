"use client"

import { Text } from "@modules/common/components/ui"
import StepHeading from "../step-heading"

import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

const Review = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards && ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 && cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-white">
      <StepHeading number={4} title="Onay" inactive={!isOpen} />
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                &quot;Siparişi tamamla&quot; butonuna tıklayarak Kullanım Koşulları,
                Satış Koşulları ve İade Politikası&apos;nı okuduğunuzu ve kabul
                ettiğinizi, Gizlilik Politikası&apos;nı okuduğunuzu onaylamış
                olursunuz.
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </div>
  )
}

export default Review
