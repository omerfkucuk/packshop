import { Metadata } from "next"
import ComingSoon from "@modules/common/components/coming-soon"

export const metadata: Metadata = {
  title: "İşini Büyüt | Packshop",
  description: "İşletmen için ihtiyaç duyduğun ürünler.",
}

export default function IsiniBuyutPage() {
  return (
    <ComingSoon
      title="İşini Büyüt"
      description="İşletmen için ihtiyaç duyduğun ürünleri ve çözümleri anlattığımız bu alan yakında burada."
    />
  )
}
