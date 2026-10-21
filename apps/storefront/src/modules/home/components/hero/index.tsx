import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import HeroSlider, { HeroSlide } from "./hero-slider"

// Stock clip (Pexels #7464140, free for commercial use), self-hosted in
// /public. Swap for real Packshop footage; each slide can have its own.
const HERO_VIDEO = "/videos/hero-packaging.mp4"

// Curated slides win when present; until then one slide per top-level
// category (its label/thumbnail drive the tabs) all playing HERO_VIDEO.
const CURATED_SLIDES: HeroSlide[] = []

async function getSlides(): Promise<HeroSlide[]> {
  if (CURATED_SLIDES.length) return CURATED_SLIDES
  const categories = await listCategories().catch(() => null)
  const slides = (categories ?? [])
    .filter((c) => !c.parent_category)
    .slice(0, 4)
    .map((c) => ({
      label: c.name,
      href: `/categories/${c.handle}`,
      image: c.products?.find((p) => p.thumbnail)?.thumbnail ?? undefined,
      video: HERO_VIDEO,
    }))
  return slides.length ? slides : [{ label: "Ürünler", href: "/store", video: HERO_VIDEO }]
}

// noissue.co hero layout: copy on the left, a full-bleed auto-rotating
// video slider filling the right half edge to edge.
const Hero = async () => {
  const slides = await getSlides()

  return (
    <section className="w-full bg-ui-bg-subtle">
      <div className="grid grid-cols-1 small:grid-cols-2 small:min-h-[calc(100vh-64px)] small:max-h-[820px]">
        <div className="flex flex-col justify-center gap-5 px-6 py-12 small:pl-[max(2rem,calc((100vw-1440px)/2+2rem))] small:pr-12 small:py-16">
          <h1 className="text-5xl small:text-6xl medium:text-7xl font-semibold tracking-tight text-black">
            Markalar için ambalaj
          </h1>
          <p className="max-w-lg text-base medium:text-lg text-black/70">
            Markanızın varlığını ve etkisini, önemli olan her yerde güçlendiren uçtan uca özel
            ambalaj çözümleri.
          </p>
          <div className="mt-2">
            <LocalizedClientLink
              href="/store"
              className="inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold text-white hover:bg-black/85 transition-colors"
            >
              Ürünleri ara
            </LocalizedClientLink>
          </div>
        </div>
        <div className="relative aspect-[4/5] xsmall:aspect-[4/3] small:aspect-auto small:h-full">
          <HeroSlider slides={slides} />
        </div>
      </div>
    </section>
  )
}

export default Hero
