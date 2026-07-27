import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="w-full bg-ui-bg-subtle">
      <div className="content-container flex flex-col items-center text-center gap-6 py-24 small:py-32">
        <h1 className="text-4xl small:text-6xl font-bold tracking-tight max-w-3xl text-ui-fg-base">
          İlk Temas.
        </h1>
        <p className="text-base small:text-lg text-ui-fg-subtle max-w-xl">
          Müşteriniz markanızla ilk kez ambalajınız üzerinden tanışır.
          Packshop, bu ilk teması unutulmaz kılmanız için ihtiyacınız olan
          her şeyi tek platformda sunar.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center justify-center bg-ui-button-inverted text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90"
          >
            Ürünleri Keşfet
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
