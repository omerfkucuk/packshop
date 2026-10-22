import { listProducts } from "@lib/data/products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import HeroConfigurator from "./hero-configurator"

// The kargo poşeti products the configurator offers, in display order.
const BAG_HANDLES = ["baskili-zipli-kargo-posetleri", "baskili-kargo-posetleri"]

// Uber-style hero: headline + an inline order form (bag type, size,
// quantity → Tasarla) on the left, a rounded 2×2 image collage with a
// call-out bar on the right.
const Hero = async ({ countryCode }: { countryCode: string }) => {
  const products = await listProducts({
    countryCode,
    queryParams: { handle: BAG_HANDLES, limit: BAG_HANDLES.length },
  })
    .then(({ response }) =>
      BAG_HANDLES.map((h) => response.products.find((p) => p.handle === h)).filter(
        (p): p is NonNullable<typeof p> => !!p
      )
    )
    .catch(() => [])

  const collage = products.flatMap((p) => (p.thumbnail ? [{ src: p.thumbnail, alt: p.title }] : []))
  const tiles = Array.from({ length: 4 }, (_, i) => collage[i % Math.max(collage.length, 1)])

  return (
    <section className="w-full bg-white">
      <div className="content-container grid grid-cols-1 small:grid-cols-2 items-center gap-10 small:gap-16 py-10 small:py-16">
        <div className="flex flex-col">
          <span className="mb-3 flex items-center gap-x-1.5 text-sm text-black/70">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
            </svg>
            Türkiye geneline teslimat
          </span>
          <h1 className="max-w-xl text-4xl xsmall:text-5xl medium:text-6xl font-bold tracking-tight text-black">
            Markanıza özel kargo poşeti alın
          </h1>
          {products.length > 0 ? (
            <HeroConfigurator products={products} />
          ) : (
            <LocalizedClientLink
              href="/categories/kargo-posetleri"
              className="mt-8 inline-flex h-12 w-fit items-center rounded-lg bg-black px-6 text-base font-medium text-white"
            >
              Kargo poşetlerini görün
            </LocalizedClientLink>
          )}
        </div>

        {collage.length > 0 && (
          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="grid grid-cols-2 gap-2 small:gap-3">
              {tiles.map((tile, i) => (
                <div
                  key={i}
                  className={i % 2 === 1 ? "translate-y-0 small:-translate-y-6" : ""}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-black/[0.04]">
                    {tile && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tile.src} alt={tile.alt} className="h-full w-full object-cover" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-3 bottom-3 small:inset-x-4 small:bottom-4 flex items-center justify-between gap-3 rounded-xl bg-black/75 py-2 pl-4 pr-2 text-white backdrop-blur">
              <span className="text-sm small:text-base font-medium">Markanız hazır mı?</span>
              <LocalizedClientLink
                href="/tasarla"
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black whitespace-nowrap hover:bg-white/90"
              >
                Hemen tasarlayın
              </LocalizedClientLink>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Hero
