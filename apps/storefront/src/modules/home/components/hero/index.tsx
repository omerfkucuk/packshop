import { cookies, headers } from "next/headers"

import { listProducts } from "@lib/data/products"
import { CITY_COOKIE, normalizeCity } from "@lib/util/turkish-cities"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import CityPicker from "../city-picker"
import HeroConfigurator from "./hero-configurator"

// The kargo poşeti products the configurator offers, in display order.
const BAG_HANDLES = ["baskili-kargo-posetleri"]

// TEMPORARY test imagery (third-party mailer photos) - replace with
// Packshop's own bag photos before launch.
const COLLAGE = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `/home/kargo-poseti-${n}.avif`,
  alt: "Baskılı kargo poşeti",
}))

// Visitor's city: their own pick (cookie) first, else Vercel's IP-based guess.
async function getCity() {
  const picked = (await cookies()).get(CITY_COOKIE)?.value
  if (picked) return normalizeCity(picked)
  return normalizeCity((await headers()).get("x-vercel-ip-city"))
}

// Uber-style hero: headline + an inline order form (bag type, size,
// quantity → Tasarla) on the left, a staggered photo collage with a
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

  const city = await getCity()
  const columns = [COLLAGE.filter((_, i) => i % 2 === 0), COLLAGE.filter((_, i) => i % 2 === 1)]

  return (
    <section className="w-full bg-white">
      <div className="content-container grid grid-cols-1 small:grid-cols-2 items-center gap-10 small:gap-16 py-10 small:py-16">
        <div className="flex flex-col">
          <CityPicker city={city} />
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

        {/* Uber-style collage: two staggered photo columns clipped to a fixed
            height, with a call-out bar over the faded bottom edge. */}
        <div className="relative mx-auto small:mr-0 h-[440px] small:h-[560px] w-full max-w-[560px] overflow-hidden rounded-2xl">
          <div className="grid h-full grid-cols-2 gap-3">
            {columns.map((column, c) => (
              <div key={c} className={c === 0 ? "flex flex-col gap-3 pt-10" : "flex flex-col gap-3"}>
                {column.map((img) => (
                  <div key={img.src} className="aspect-[4/3] shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
            <span className="text-base small:text-lg font-medium text-white">Markanız hazır mı?</span>
            <LocalizedClientLink
              href="/tasarla"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black whitespace-nowrap hover:bg-white/90"
            >
              Hemen tasarlayın
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
