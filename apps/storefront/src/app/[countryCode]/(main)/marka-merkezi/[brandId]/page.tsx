import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { retrieveBrand } from "@lib/data/brands"
import BrandForm from "@modules/brand-center/components/brand-form"
import BrandDesignWorks from "@modules/brand-center/components/brand-design-works"

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
        className="max-w-6xl w-full mx-auto px-4 py-12"
        data-testid="add-brand-page-wrapper"
      >
        <div className="max-w-2xl">
          <BrandForm countryCode={countryCode} />
        </div>
      </div>
    )
  }

  const brand = await retrieveBrand(brandId)

  if (!brand) {
    notFound()
  }

  return (
    <div
      className="max-w-6xl w-full mx-auto px-4 py-12"
      data-testid="edit-brand-page-wrapper"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 items-start">
        <BrandForm countryCode={countryCode} brand={brand} />
        <BrandDesignWorks />
      </div>
    </div>
  )
}
