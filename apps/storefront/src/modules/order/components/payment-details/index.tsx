import { isStripeLike, paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  if (!payment) {
    return null
  }
  const info = paymentInfoMap[payment.provider_id]

  return (
    <section>
      <h2 className="text-lg font-bold text-black mb-4">Ödeme</h2>
      <div className="flex items-center gap-x-3 text-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/[0.04]">
          {info?.icon}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-black" data-testid="payment-method">
            {info?.title ?? payment.provider_id}
          </span>
          <span className="text-black/60 break-words" data-testid="payment-amount">
            {isStripeLike(payment.provider_id) && payment.data?.card_last4
              ? `**** **** **** ${payment.data.card_last4}`
              : `${convertToLocale({
                  amount: payment.amount,
                  currency_code: order.currency_code,
                })} · ${new Date(payment.created_at ?? "").toLocaleDateString("tr-TR")}`}
          </span>
        </div>
      </div>
    </section>
  )
}

export default PaymentDetails
