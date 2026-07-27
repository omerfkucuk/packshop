import LocalizedClientLink from "@modules/common/components/localized-client-link"

const FirstContact = () => {
  return (
    <div className="content-container py-16 small:py-24">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center">
        <h2 className="text-4xl small:text-5xl font-bold tracking-tight text-ui-fg-base">
          İlk Temas.
        </h2>
        <p className="text-base small:text-lg text-ui-fg-subtle">
          Müşteriniz markanızla ilk kez ambalajınız üzerinden tanışır.
          Packshop, bu ilk teması unutulmaz kılmanız için ihtiyacınız olan
          her şeyi tek platformda sunar.
        </p>
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center justify-center bg-ui-button-inverted text-white px-8 py-3 rounded-full text-sm font-semibold hover:opacity-90"
        >
          Ürünleri Keşfet
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default FirstContact
