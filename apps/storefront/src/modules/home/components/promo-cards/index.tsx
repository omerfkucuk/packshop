import LocalizedClientLink from "@modules/common/components/localized-client-link"

type PromoCard = {
  label: string
  title: string
  description: string
  ctaLabel: string
  href: string
  bgClassName: string
}

const cards: PromoCard[] = [
  {
    label: "KAMPANYA",
    title: "500 TL üzeri kargo bedava",
    description: "Belirli tutarın üzerindeki siparişlerde kargo ücreti yok.",
    ctaLabel: "Alışverişe başla",
    href: "/store",
    bgClassName: "bg-[#e0d4f7]",
  },
  {
    label: "İNDİRİM",
    title: "İlk siparişine özel %15 indirim",
    description: "Üye ol, ilk siparişinde geçerli kodu e-postana alalım.",
    ctaLabel: "Üye ol",
    href: "/account",
    bgClassName: "bg-[#f0e27a]",
  },
  {
    label: "FIRSAT",
    title: "Haftanın öne çıkanları",
    description: "Sınırlı süreliğine seçili ürünlerde ekstra avantaj.",
    ctaLabel: "Ürünleri gör",
    href: "/store",
    bgClassName: "bg-[#e4e4e4]",
  },
]

const PromoCards = () => {
  return (
    <div className="content-container -mt-12 small:-mt-16 relative z-10">
      <div className="grid grid-cols-1 small:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`flex flex-col gap-3 p-6 rounded-lg ${card.bgClassName}`}
          >
            <span className="text-xs font-semibold tracking-wide text-ui-fg-subtle">
              {card.label}
            </span>
            <h3 className="text-xl font-bold text-ui-fg-base">
              {card.title}
            </h3>
            <p className="text-sm text-ui-fg-subtle">{card.description}</p>
            <LocalizedClientLink
              href={card.href}
              className="text-sm font-semibold underline underline-offset-4 mt-1"
            >
              {card.ctaLabel}
            </LocalizedClientLink>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PromoCards
