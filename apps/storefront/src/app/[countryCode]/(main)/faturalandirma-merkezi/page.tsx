import { Metadata } from "next"
import BackToAccount from "@modules/account/components/back-to-account"
import { redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { retrieveBillingAddress } from "@lib/data/billing"
import BillingForm from "@modules/billing-center/components/billing-form"

export const metadata: Metadata = {
  title: "Firma bilgileri | Packshop",
  description: "Firma ve fatura bilgilerinizi görüntüleyin ve düzenleyin.",
}

export default async function BillingCenterPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const billingAddress = await retrieveBillingAddress()

  return (
    <div
      className="max-w-2xl w-full mx-auto px-4 py-12"
      data-testid="billing-center-page-wrapper"
    >
      <BackToAccount />
      <BillingForm billingAddress={billingAddress} />
    </div>
  )
}
