import { PublicBrand } from "@lib/data/brands"

type BrandKitViewProps = {
  brand: PublicBrand
}

const SOCIAL_LINKS: { key: keyof PublicBrand; label: string }[] = [
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "twitter_url", label: "Twitter" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "website_url", label: "Website" },
]

// The read-only "brand kit" layout - logo, alternate logos, color palette,
// typography, social links, slogan. Used both on the owner's own brand page
// and on the public /marka-merkezi/paylas/[shareId] page, so it never
// renders any edit/delete/upload affordances itself.
const BrandKitView = ({ brand }: BrandKitViewProps) => {
  const socialLinks = SOCIAL_LINKS.filter((s) => brand[s.key])

  return (
    <div className="flex flex-col gap-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black">
          {brand.brand_name}
        </h1>
        {brand.company_name && (
          <p className="text-base text-black/50 mt-1">{brand.company_name}</p>
        )}
        {brand.slogan && (
          <p className="text-lg text-black/70 mt-4 italic">
            &ldquo;{brand.slogan}&rdquo;
          </p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-black/50 tracking-wide mb-3">
          LOGO
        </h2>
        {brand.logo_url ? (
          <div className="border border-black/10 rounded-lg p-8 bg-black/[0.02] flex items-center justify-center max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logo_url}
              alt={brand.brand_name}
              className="max-h-40 max-w-full object-contain"
            />
          </div>
        ) : (
          <p className="text-sm text-black/50">Henüz logo yüklenmemiş.</p>
        )}

        {!!brand.alternate_logo_urls?.length && (
          <div className="flex flex-wrap gap-3 mt-4">
            {brand.alternate_logo_urls.map((url) => (
              <div
                key={url}
                className="border border-black/10 rounded-lg p-4 bg-black/[0.02] h-24 w-24 flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Alternatif logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {!!brand.colors?.length && (
        <div>
          <h2 className="text-sm font-semibold text-black/50 tracking-wide mb-3">
            RENKLER
          </h2>
          <div className="flex flex-wrap gap-4">
            {brand.colors.map((color) => (
              <div key={color} className="flex flex-col items-center gap-y-2">
                <div
                  className="h-16 w-16 rounded-lg border border-black/10"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-black/70 uppercase">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(brand.heading_font || brand.body_font) && (
        <div>
          <h2 className="text-sm font-semibold text-black/50 tracking-wide mb-3">
            YAZI TİPİ
          </h2>
          <div className="flex flex-col gap-y-3">
            {brand.heading_font && (
              <div>
                <p className="text-xs text-black/50 mb-1">Başlık</p>
                <p
                  className="text-2xl text-black"
                  style={{ fontFamily: brand.heading_font }}
                >
                  {brand.heading_font}
                </p>
              </div>
            )}
            {brand.body_font && (
              <div>
                <p className="text-xs text-black/50 mb-1">Gövde</p>
                <p
                  className="text-lg text-black"
                  style={{ fontFamily: brand.body_font }}
                >
                  {brand.body_font}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!!socialLinks.length && (
        <div>
          <h2 className="text-sm font-semibold text-black/50 tracking-wide mb-3">
            SOSYAL MEDYA
          </h2>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map(({ key, label }) => (
              <a
                key={key}
                href={brand[key] as string}
                target="_blank"
                rel="noreferrer"
                className="border border-black/10 rounded-lg px-4 h-10 flex items-center text-sm text-black hover:border-black/20 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BrandKitView
