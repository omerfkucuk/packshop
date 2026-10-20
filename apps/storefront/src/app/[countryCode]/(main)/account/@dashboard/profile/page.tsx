import { Metadata } from "next"

import ProfilePhone from "@modules/account/components/profile-phone"
import User from "@modules/common/icons/user"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileBusinessEmail from "@modules/account/components/profile-business-email"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Kişisel bilgiler",
  description: "Packshop profilinizi görüntüleyin ve düzenleyin.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full max-w-2xl" data-testid="profile-page-wrapper">
      <h1 className="text-3xl font-bold tracking-tight text-black">
        Kişisel bilgiler
      </h1>
      <div className="mt-6 mb-4 flex items-center justify-center h-24 w-24 rounded-full bg-black/60 text-white">
        <User size={44} />
      </div>
      <div className="flex flex-col w-full">
        <ProfileName customer={customer} />
        <ProfilePhone customer={customer} />
        <ProfileEmail customer={customer} />
        <ProfileBusinessEmail customer={customer} />
        <ProfileBillingAddress customer={customer} regions={regions} />
      </div>
    </div>
  )
}
