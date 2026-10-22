import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Step = {
  title: string
  description: string
  image: string
}

// TEMPORARY imagery reused from the hero collage - replace with per-step
// illustrations once they're ready.
const STEPS: Step[] = [
  {
    title: "Poşetinizi seçin",
    description:
      "Kargo poşetinizin boyutunu ve adedini seçin, birim fiyatı ve toplam tutarı anında görün.",
    image: "/home/kargo-poseti-1.avif",
  },
  {
    title: "Markanızı ekleyin",
    description:
      "Logonuzu, renklerinizi ve yazı tiplerinizi yükleyin ya da Marka Merkezi'nde kayıtlı markanızı tek tıkla kullanın.",
    image: "/home/kargo-poseti-2.avif",
  },
  {
    title: "Tasarımınızı şekillendirin",
    description:
      "Hazır temalardan birini seçin, metin ve görselleri düzenleyin; dilerseniz yapay zekâya tarif ederek son rötuşları yaptırın.",
    image: "/home/kargo-poseti-3.avif",
  },
  {
    title: "Siparişinizi verin",
    description:
      "Tasarımınızı onaylayıp sepete ekleyin, ödemenizi yapın. Poşetleriniz basılıp kapınıza gelsin.",
    image: "/home/kargo-poseti-4.avif",
  },
]

// Uber-style "how it works": each step is an image, a point on a vertical
// timeline, and its copy. On mobile the image moves above the copy.
const DesignSteps = () => {
  return (
    <section className="content-container py-12 small:py-20">
      <h2 className="max-w-xl text-3xl small:text-4xl font-bold tracking-tight text-black">
        Markanıza özel kargo poşetini birkaç adımda tasarlayın
      </h2>

      <ol className="mt-10 small:mt-14">
        {STEPS.map((step, i) => {
          const last = i === STEPS.length - 1
          return (
            <li key={step.title} className="flex gap-5 small:gap-10">
              <div className="hidden small:block w-[320px] shrink-0 pb-12">
                <StepImage step={step} />
              </div>

              {/* Timeline: a square marker at the step title on a line that
                  runs the full height of the list. */}
              <div className="relative flex w-3 shrink-0 justify-center">
                <span className="absolute inset-y-0 w-px bg-black" />
                <span className="relative mt-1.5 h-2 w-2 bg-black" />
              </div>

              <div className="flex-1 pb-12 small:max-w-md">
                <div className="mb-4 small:hidden">
                  <StepImage step={step} />
                </div>
                <h3 className="text-base font-semibold text-black">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-2 text-sm text-black/70">{step.description}</p>
                {last && (
                  <LocalizedClientLink
                    href="/tasarla"
                    className="mt-6 inline-block text-sm text-black underline underline-offset-4 hover:no-underline"
                  >
                    Hemen tasarlamaya başlayın
                  </LocalizedClientLink>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

const StepImage = ({ step }: { step: Step }) => (
  <div className="aspect-[3/2] overflow-hidden bg-black/[0.04]">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={step.image} alt={step.title} loading="lazy" className="h-full w-full object-cover" />
  </div>
)

export default DesignSteps
