import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  not_fulfilled: "Hazırlanıyor",
  partially_fulfilled: "Kısmen hazırlandı",
  fulfilled: "Hazırlandı",
  partially_shipped: "Kısmen kargolandı",
  shipped: "Kargolandı",
  partially_delivered: "Kısmen teslim edildi",
  delivered: "Teslim edildi",
  canceled: "İptal edildi",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: "Ödenmedi",
  awaiting: "Ödeme bekleniyor",
  captured: "Ödendi",
  partially_captured: "Kısmen ödendi",
  refunded: "İade edildi",
  partially_refunded: "Kısmen iade edildi",
  canceled: "İptal edildi",
  requires_action: "İşlem gerekiyor",
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string, labels: Record<string, string>) => {
    if (labels[str]) {
      return labels[str]
    }
    const formatted = str.split("_").join(" ")
    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div>
      <Text className="text-black/70">
        Sipariş onay bilgilerini{" "}
        <span className="font-semibold text-black" data-testid="order-email">
          {order.email}
        </span>{" "}
        adresine gönderdik.
      </Text>
      <Text className="mt-2 text-black/70">
        Sipariş tarihi:{" "}
        <span className="text-black" data-testid="order-date">
          {new Date(order.created_at).toLocaleDateString("tr-TR")}
        </span>
      </Text>
      <Text className="mt-2 text-black">
        Sipariş no: <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text className="text-black/70">
              Sipariş durumu:{" "}
              <span className="text-black" data-testid="order-status">
                {formatStatus(order.fulfillment_status, FULFILLMENT_STATUS_LABELS)}
              </span>
            </Text>
            <Text className="text-black/70">
              Ödeme durumu:{" "}
              <span className="text-black" data-testid="order-payment-status">
                {formatStatus(order.payment_status, PAYMENT_STATUS_LABELS)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
