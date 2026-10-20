import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Sepetim | Packshop",
  description: "Sepetinizi görüntüleyin.",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()
  const shippingOptions = cart
    ? (await listCartOptions().catch(() => ({ shipping_options: [] }))).shipping_options
    : []

  return <CartTemplate cart={cart} customer={customer} shippingOptions={shippingOptions} />
}
