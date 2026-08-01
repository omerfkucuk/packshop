import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getSharedBrand } from "@lib/data/brands"
import BrandKitView from "@modules/brand-center/components/brand-kit-view"

type Props = {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { shareId } = await props.params
  const brand = await getSharedBrand(shareId)

  if (!brand) {
    return { title: "Marka bulunamadı | Packshop" }
  }

  return {
    title: `${brand.brand_name} | Marka Kiti`,
    description: brand.slogan || `${brand.brand_name} marka kiti.`,
  }
}

export default async function SharedBrandPage(props: Props) {
  const { shareId } = await props.params
  const brand = await getSharedBrand(shareId)

  if (!brand) {
    notFound()
  }

  return (
    <div
      className="max-w-3xl w-full mx-auto px-4 py-12"
      data-testid="shared-brand-page-wrapper"
    >
      <BrandKitView brand={brand} />
    </div>
  )
}
