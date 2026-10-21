import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Postmates-style hero: one flat Packshop-green field that the homepage
// nav blends into (see NavShell), a big left-aligned headline and one CTA.
// The green area is meant to later illustrate the kargo poşeti print process.
const Hero = () => {
  return (
    <section data-nav-hero className="w-full bg-[#0E8345] text-black">
      <div className="content-container flex min-h-[calc(100svh-64px)] small:min-h-[640px] small:h-[calc(100vh-64px)] small:max-h-[860px] flex-col justify-center py-16">
        <h1 className="max-w-4xl text-5xl xsmall:text-6xl medium:text-7xl font-bold tracking-tight leading-[1.05]">
          Packshop ile markanıza özel kargo poşetinizi yaptırın.
        </h1>
        <p className="mt-5 max-w-xl text-base small:text-xl text-black/75">
          Logonuzu ekleyin, ölçünüzü seçin; baskılı kargo poşetleriniz kapınıza gelsin.
        </p>
        <div className="mt-8">
          <LocalizedClientLink
            href="/categories/kargo-posetleri"
            className="inline-flex h-14 items-center justify-center rounded-full bg-black px-8 text-base font-semibold text-white hover:bg-black/85 transition-colors"
            data-testid="hero-cta"
          >
            Kargo poşetini tasarla
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default Hero
