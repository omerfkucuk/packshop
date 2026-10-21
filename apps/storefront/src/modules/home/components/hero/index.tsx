import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import HeroSlider, { HeroSlide } from "./hero-slider"

// Curated slides win when present (real packaging photos/videos, e.g. from
// customers); until then the slider falls back to the top-level categories.
const CURATED_SLIDES: HeroSlide[] = []

async function getSlides(): Promise<HeroSlide[]> {
  if (CURATED_SLIDES.length) return CURATED_SLIDES
  const categories = await listCategories().catch(() => null)
  return (categories ?? [])
    .filter((c) => !c.parent_category)
    .map((c) => ({
      label: c.name,
      href: `/categories/${c.handle}`,
      image: c.products?.find((p) => p.thumbnail)?.thumbnail ?? undefined,
    }))
    .filter((s) => s.image)
    .slice(0, 5)
}

// noissue-style hero: copy on the left over a warm background, an
// auto-rotating media slider with labeled tabs on the right.
const Hero = async () => {
  const slides = await getSlides()

  return (
    <section className="w-full bg-[#F5F0E8]">
      <div className="content-container grid grid-cols-1 small:grid-cols-2 items-center gap-10 small:gap-16 py-10 small:py-20">
        <div className="flex flex-col gap-5">
          <span className="text-sm font-semibold uppercase tracking-widest text-black/50">
            Markalar için ambalaj
          </span>
          <h1 className="text-5xl small:text-7xl font-bold tracking-tight text-black">
            İlk Temas.
          </h1>
          <p className="max-w-lg text-base small:text-lg text-black/70">
            Müşteriniz markanızla ilk kez ambalajınız üzerinden tanışır. Packshop, bu ilk teması
            unutulmaz kılmanız için ihtiyacınız olan her şeyi tek platformda sunar.
          </p>
          <div className="mt-2 flex flex-col xsmall:flex-row gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold text-white hover:bg-black/85 transition-colors"
            >
              Ürünleri keşfet
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/tasarla"
              className="inline-flex h-12 items-center justify-center rounded-full border border-black/20 bg-white/60 px-8 text-sm font-semibold text-black hover:border-black/50 transition-colors"
            >
              Tasarla&apos;da tasarla
            </LocalizedClientLink>
          </div>
        </div>
        {slides.length > 0 && <HeroSlider slides={slides} />}
      </div>
    </section>
  )
}

export default Hero
