import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { retrieveBrand } from "@lib/data/brands"
import BrandForm from "@modules/brand-center/components/brand-form"

export const metadata: Metadata = {
  title: "Marka Merkezi | Packshop",
}

export default async function BrandDetailPage(props: {
  params: Promise<{ countryCode: string; brandId: string }>
}) {
  const { countryCode, brandId } = await props.params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  if (brandId === "yeni") {
    return (
      <div
        className="max-w-2xl w-full mx-auto px-4 py-12"
        data-testid="add-brand-page-wrapper"
      >
        <BrandForm countryCode={countryCode} />
      </div>
    )
  }

  const brand = await retrieveBrand(brandId)

  if (!brand) {
    notFound()
  }

  return (
    <div
      className="max-w-2xl w-full mx-auto px-4 py-12"
      data-testid="edit-brand-page-wrapper"
    >
      <BrandForm countryCode={countryCode} brand={brand} />
    </div>
  )
}
