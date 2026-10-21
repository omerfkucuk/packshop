"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

export type HeroSlide = {
  label: string
  href: string
  image?: string
  /** Optional muted looping video (mp4); `image` is its poster. */
  video?: string
}

const INTERVAL_MS = 6500

const HeroSlider = ({ slides }: { slides: HeroSlide[] }) => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
  }, [])

  const go = useCallback(
    (delta: number) => setActive((i) => (i + delta + slides.length) % slides.length),
    [slides.length]
  )

  // Autoplay; restarts whenever the slide changes so a manual pick gets a full interval.
  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return
    const t = setTimeout(() => go(1), INTERVAL_MS)
    return () => clearTimeout(t)
  }, [active, paused, reducedMotion, slides.length, go])

  const autoplaying = !paused && !reducedMotion && slides.length > 1

  return (
    <div
      className="flex flex-col gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Öne çıkan ürünler"
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl small:rounded-3xl bg-white max-h-[62vh]"
        onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const dx = e.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchStartX.current = null
        }}
      >
        {slides.map((slide, i) => (
          <LocalizedClientLink
            key={slide.href + i}
            href={slide.href}
            aria-hidden={i !== active}
            tabIndex={i === active ? 0 : -1}
            className={clx(
              "absolute inset-0 transition-opacity duration-700",
              i === active ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            {slide.video ? (
              <video
                src={slide.video}
                poster={slide.image}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image}
                alt={slide.label}
                className="h-full w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            )}
            <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-black shadow-sm">
              {slide.label} →
            </span>
          </LocalizedClientLink>
        ))}

        {/* Story-style progress segments */}
        {slides.length > 1 && (
          <div className="absolute inset-x-4 top-4 flex gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-black/15">
                <span
                  key={i === active ? `on-${active}-${autoplaying}` : "off"}
                  className={clx(
                    "block h-full rounded-full bg-black/70",
                    i < active && "w-full",
                    i > active && "w-0",
                    i === active && (autoplaying ? "animate-hero-progress" : "w-full")
                  )}
                  style={i === active && autoplaying ? { animationDuration: `${INTERVAL_MS}ms` } : undefined}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
          <div className="flex w-max gap-2" role="tablist">
            {slides.map((slide, i) => (
              <button
                key={slide.href + i}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={clx(
                  "flex items-center gap-x-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition-colors whitespace-nowrap",
                  i === active
                    ? "border-black bg-white text-black"
                    : "border-black/10 bg-white/50 text-black/60 hover:text-black"
                )}
              >
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/[0.06]">
                  {slide.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.image} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                {slide.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default HeroSlider
