import { Metadata } from "next"
import ComingSoon from "@modules/common/components/coming-soon"

export const metadata: Metadata = {
  title: "Tasarla | Packshop",
  description: "Kendi tasarımını oluştur.",
}

export default function TasarlaPage() {
  return (
    <ComingSoon
      title="Kendi Tasarımını Oluştur"
      description="Seçtiğin ürünü doğrudan tasarım stüdyomuza taşıyıp kendine özel hale getirebileceğin bu alan yakında hazır olacak."
    />
  )
}
