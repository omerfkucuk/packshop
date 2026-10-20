import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Adreslerim",
  description: "Adreslerinizi görüntüleyin.",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <h1 className="text-3xl font-bold tracking-tight text-black">
        Adreslerim
      </h1>
      <p className="mt-2 mb-6 text-base text-black/60">
        Ödeme sırasında seçebileceğiniz teslimat adresleri.
      </p>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
