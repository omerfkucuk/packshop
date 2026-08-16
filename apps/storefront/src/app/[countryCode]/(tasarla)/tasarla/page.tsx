import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { listBrands } from "@lib/data/brands"
import { getDesignDraft } from "@lib/data/designs"
import { isCustomProduct } from "@lib/util/product"
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

  if (!region) {
    notFound()
  }

  const customer = await retrieveCustomer()

  const [product, brands, { response }, categories] = await Promise.all([
    productHandle
      ? listProducts({
          countryCode,
          queryParams: { handle: productHandle },
        }).then(({ response }) => response.products[0] ?? null)
      : null,
    customer ? listBrands() : [],
    listProducts({
      countryCode,
      queryParams: {
        limit: 100,
        fields: "handle,title,thumbnail,*images,*categories,*tags",
      },
    }),
    listCategories(),
  ])
  const customProducts = response.products.filter(isCustomProduct)

  // Only fetched once the product itself is known - a saved draft is keyed
  // by product id, so there's nothing to look up before then.
  const designDraft =
    customer && product ? await getDesignDraft(product.id) : null

  return (
    <DesignerShell
      // Force a remount when switching products from inside the designer -
      // otherwise the previous product's option/variant selection state
      // sticks around and never matches the new product's variants.
      key={product?.id ?? "none"}
      product={product}
      region={region}
      countryCode={countryCode}
      initialVariantId={variantId}
      initialQuantity={quantity ? parseInt(quantity, 10) || 1 : 1}
      brands={brands}
      products={customProducts}
      categories={categories}
      initialDesignDraft={designDraft}
    />
  )
}
