"use client"

import { useEffect } from "react"

const loadedFonts = new Set<string>()

type GoogleFontLoaderProps = {
  fonts: (string | null | undefined)[]
}

// Injects a Google Fonts stylesheet <link> for whichever font names are
// passed in, so a brand's chosen heading/body font actually renders instead
// of silently falling back to the system default. Font choice is per-brand
// and only known at runtime, so this can't use next/font/google (build-time
// only) - it uses Google's free CSS delivery API instead, which needs no key.
const GoogleFontLoader = ({ fonts }: GoogleFontLoaderProps) => {
  useEffect(() => {
    const newFonts = fonts.filter(
      (font): font is string => !!font && !loadedFonts.has(font)
    )

    if (newFonts.length === 0) {
      return
    }

    newFonts.forEach((font) => loadedFonts.add(font))

    const family = newFonts
      .map((font) => `family=${encodeURIComponent(font)}:wght@400;700`)
      .join("&")

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = `https://fonts.googleapis.com/css2?${family}&display=swap`
    document.head.appendChild(link)
  }, [fonts])

  return null
}

export default GoogleFontLoader
