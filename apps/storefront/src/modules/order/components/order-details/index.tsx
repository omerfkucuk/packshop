import { HttpTypes } from "@medusajs/types"

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
  authorized: "Ödeme onaylandı",
  captured: "Ödendi",
  partially_captured: "Kısmen ödendi",
  refunded: "İade edildi",
  partially_refunded: "Kısmen iade edildi",
  canceled: "İptal edildi",
  requires_action: "İşlem gerekiyor",
}

export const formatStatus = (str: string, labels: Record<string, string>) => {
  if (labels[str]) {
    return labels[str]
  }
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

export const fulfillmentLabel = (order: HttpTypes.StoreOrder) =>
  formatStatus(order.fulfillment_status, FULFILLMENT_STATUS_LABELS)

// Order number / date / email as a small key-value grid (stacks on phones).
const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const rows: [string, string, string][] = [
    ["Sipariş no", `#${order.display_id}`, "order-id"],
    ["Sipariş tarihi", new Date(order.created_at).toLocaleDateString("tr-TR"), "order-date"],
    ["E-posta", order.email ?? "", "order-email"],
    ...(showStatus
      ? ([
          ["Sipariş durumu", fulfillmentLabel(order), "order-status"],
          ["Ödeme durumu", formatStatus(order.payment_status, PAYMENT_STATUS_LABELS), "order-payment-status"],
        ] as [string, string, string][])
      : []),
  ]

  return (
    <dl className="grid grid-cols-1 xsmall:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {rows.map(([label, value, testId]) => (
        <div key={label} className="flex flex-col min-w-0">
          <dt className="text-black/60">{label}</dt>
          <dd className="font-medium text-black break-words" data-testid={testId}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default OrderDetails
