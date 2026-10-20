import { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"

import ProfilePhone from "@modules/account/components/profile-phone"
import User from "@modules/common/icons/user"
import ProfileBusinessEmail from "@modules/account/components/profile-business-email"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileMetadataField from "@modules/account/components/profile-metadata-field"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Kişisel bilgiler",
  description: "Packshop profilinizi görüntüleyin ve düzenleyin.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()

  if (!customer) {
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
        {hasCompanyInfo(customer) && (
          <>
            <ProfileMetadataField
              customer={customer}
              field="job_title"
              label="İş unvanı"
              placeholder="İş unvanı (ör. Satın Alma Müdürü)"
            />
            <ProfileMetadataField
              customer={customer}
              field="linkedin_url"
              label="LinkedIn profili"
              type="url"
              placeholder="LinkedIn profil adresi"
              hint="Örn. https://www.linkedin.com/in/adiniz"
            />
          </>
        )}
      </div>
    </div>
  )
}

// Job title / LinkedIn only make sense for B2B customers - shown once a
// company email or a Firma bilgileri company name exists.
const hasCompanyInfo = (customer: HttpTypes.StoreCustomer) =>
  !!customer.metadata?.business_email ||
  !!customer.addresses?.some((addr) => addr.is_default_billing && addr.company)
