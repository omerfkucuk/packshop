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

// Uber-style "how it works": one tall card per step - the photo runs into
// a black base where the step's copy sits in white. Cards sit in a row on
// desktop and scroll sideways (snapping per card) on mobile.
const DesignSteps = () => {
  return (
    <section className="content-container py-12 small:py-20">
      <h2 className="max-w-xl text-3xl small:text-4xl font-bold tracking-tight text-black">
        Markanıza özel kargo poşetini birkaç adımda tasarlayın
      </h2>

      <ol className="no-scrollbar -mx-6 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 small:mx-0 small:grid small:grid-cols-4 small:overflow-visible small:px-0">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-black xsmall:w-[45%] small:w-auto"
          >
            <div className="relative aspect-[4/5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.image} alt={step.title} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
              <span className="absolute bottom-0 left-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-lg font-bold text-black">
                {i + 1}
              </span>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-6 pt-5">
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-white/75">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default DesignSteps
