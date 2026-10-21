"use client"

import { HttpTypes } from "@medusajs/types"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import PaymentDetails from "@modules/order/components/payment-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

// The account layout already renders the "← Hesabım" back link above this.
const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({ order }) => {
  return (
    <div className="flex flex-col gap-y-8" data-testid="order-details-container">
      <h1 className="text-3xl font-bold tracking-tight text-black">Sipariş #{order.display_id}</h1>
      <div className="rounded-xl border border-black/10 p-5 small:p-6">
        <OrderDetails order={order} showStatus />
      </div>
      <section className="flex flex-col gap-y-2">
        <h2 className="text-lg font-bold text-black">Ürünler</h2>
        <Items order={order} />
        <OrderSummary order={order} />
      </section>
      <ShippingDetails order={order} />
      <PaymentDetails order={order} />
      <Help />
    </div>
  )
}

export default OrderDetailsTemplate
