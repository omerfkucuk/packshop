import { Metadata } from "next"
import ComingSoon from "@modules/common/components/coming-soon"

export const metadata: Metadata = {
  title: "Keşfet | Packshop",
  description: "İlham veren içerikler ve örnek çalışmalar.",
}

export default function KesfetPage() {
  return (
    <ComingSoon
      title="Keşfet"
      description="Örnek çalışmalar, ilham verici içerikler ve rehberler yakında burada."
    />
  )
}
