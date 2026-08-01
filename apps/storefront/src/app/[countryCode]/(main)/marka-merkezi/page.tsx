import { Metadata } from "next"
import { redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { listBrands } from "@lib/data/brands"
import BrandCenter from "@modules/brand-center/components/brand-center"

export const metadata: Metadata = {
  title: "Marka Merkezi | Packshop",
  description: "Marka kimliğini oluştur ve paylaş.",
}

export default async function MarkaMerkeziPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const brands = await listBrands()

  return (
    <div
      className="max-w-6xl w-full mx-auto px-4 py-12"
      data-testid="brand-center-page-wrapper"
    >
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          Marka Merkezi
        </h1>
        <p className="text-base text-black/70">
          Firmana ait logo, renk, yazı tipi ve sosyal medya bilgilerini tek bir
          yerde topla. Dilediğin kadar marka oluşturup her birini
          paylaşabilirsin.
        </p>
      </div>
      <BrandCenter brands={brands} />
    </div>
  )
}
