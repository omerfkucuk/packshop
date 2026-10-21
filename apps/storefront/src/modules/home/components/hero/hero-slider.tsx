"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

export type HeroSlide = {
  label: string
  href: string
  /** Thumbnail for the tab (and poster for the video). */
  image?: string
  /** Muted looping mp4; falls back to `image` when absent. */
  video?: string
}

const INTERVAL_MS = 6500

// Fills its (positioned) parent: media full-bleed, story-style progress
// segments on top, thumbnail tabs overlaid at the bottom - noissue-style.
const HeroSlider = ({ slides }: { slides: HeroSlide[] }) => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  const go = useCallback(
    (delta: number) => setActive((i) => (i + delta + slides.length) % slides.length),
    [slides.length]
  )

  // Restarts on every change so a manual pick gets a full interval.
  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return
    const t = setTimeout(() => go(1), INTERVAL_MS)
    return () => clearTimeout(t)
  }, [active, paused, reducedMotion, slides.length, go])

  const autoplaying = !paused && !reducedMotion && slides.length > 1
  // Slides sharing one video file share one <video>, so switching tabs
  // doesn't restart the clip.
  const sharedVideo = slides.every((s) => s.video && s.video === slides[0].video)
    ? slides[0].video
    : undefined

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchStartX.current = null
      }}
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
    >
      {sharedVideo ? (
        <video
          src={sharedVideo}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        slides.map((slide, i) => (
          <div
            key={slide.href + i}
            aria-hidden={i !== active}
            className={clx(
              "absolute inset-0 transition-opacity duration-700",
              i === active ? "opacity-100" : "opacity-0"
            )}
          >
            {slide.video ? (
              <video
                src={slide.video}
                poster={slide.image}
                className="h-full w-full object-cover"
                autoPlay={!reducedMotion}
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.image} alt={slide.label} className="h-full w-full object-cover" />
            )}
          </div>
        ))
      )}

      {/* Legibility gradients behind the overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />

      {slides.length > 1 && (
        <div className="absolute inset-x-4 small:inset-x-6 top-4 small:top-6 flex gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/35">
              <span
                key={i === active ? `on-${active}-${autoplaying}` : "off"}
                className={clx(
                  "block h-full rounded-full bg-white",
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

      <div className="absolute inset-x-0 bottom-4 small:bottom-6 overflow-x-auto px-4 small:px-6 no-scrollbar">
        <div className="flex w-max gap-2" role="tablist">
          {slides.map((slide, i) => (
            <button
              key={slide.href + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={clx(
                "flex items-center gap-x-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium whitespace-nowrap transition-colors backdrop-blur",
                i === active ? "bg-white text-black" : "bg-white/25 text-white hover:bg-white/40"
              )}
            >
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/60">
                {slide.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.image} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              {slide.label}
            </button>
          ))}
          <LocalizedClientLink
            href={slides[active].href}
            className="flex items-center rounded-full bg-black/60 px-4 text-sm font-medium text-white whitespace-nowrap backdrop-blur hover:bg-black/80"
          >
            İncele →
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default HeroSlider
