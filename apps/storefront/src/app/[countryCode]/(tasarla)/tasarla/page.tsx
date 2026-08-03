import { Metadata } from "next"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { listBrands } from "@lib/data/brands"
import ComingSoon from "@modules/common/components/coming-soon"
import DesignerShell from "@modules/designer/components/designer-shell"

export const metadata: Metadata = {
  title: "Tasarla | Packshop",
  description: "Kendi tasarımını oluştur.",
}

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{
    product?: string
    variant?: string
    quantity?: string
  }>
}

export default async function TasarlaPage(props: Props) {
  const { countryCode } = await props.params
  const { product: productHandle, variant: variantId, quantity } =
    await props.searchParams

  const region = await getRegion(countryCode)

  const product =
    region && productHandle
      ? await listProducts({
          countryCode,
          queryParams: { handle: productHandle },
        }).then(({ response }) => response.products[0])
      : null

  if (!region || !product) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <ComingSoon
          title="Kendi Tasarımını Oluştur"
          description="Bir ürün seçip 'Tasarla' butonuna bastığında burada tasarım stüdyosu açılacak."
        />
      </div>
    )
  }

  const customer = await retrieveCustomer()
  const brands = customer ? await listBrands() : []

  return (
    <DesignerShell
      product={product}
      region={region}
      countryCode={countryCode}
      initialVariantId={variantId}
      initialQuantity={quantity ? parseInt(quantity, 10) || 1 : 1}
      brands={brands}
    />
  )
}
