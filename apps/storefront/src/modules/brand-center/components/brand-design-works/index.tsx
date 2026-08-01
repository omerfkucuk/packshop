import { Swatch } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Placeholder until the "Tasarla" tool exists and design work can actually be
// tied to a brand_id - this is where that work will render once it does.
const BrandDesignWorks = () => {
  return (
    <div className="border border-black/10 rounded-lg p-6 flex flex-col items-center text-center gap-y-3">
      <Swatch className="text-black/30" />
      <span className="text-sm font-semibold text-black">Tasarım çalışmaları</span>
      <p className="text-sm text-black/50">
        Bu markayla henüz bir tasarım çalışması oluşturulmadı. Hazır olduğunda
        burada listelenecek ve paylaşım linkinde de görünecek.
      </p>
      <LocalizedClientLink
        href="/tasarla"
        className="text-sm text-black underline underline-offset-2 hover:no-underline"
      >
        Tasarla&apos;ya git
      </LocalizedClientLink>
    </div>
  )
}

export default BrandDesignWorks
