"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { CITY_COOKIE, TURKISH_CITIES, normalizeCity } from "@lib/util/turkish-cities"

// Uber's "İstanbul, TR · Şehri değiştirin": shows the detected city and
// lets the visitor pick another or use the browser's location. The choice
// is kept in a cookie (future city-based pricing reads it server-side).
const CityPicker = ({ city }: { city: string | null }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = (value: string) => {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    setOpen(false)
    router.refresh()
  }

  // Coordinates are only requested on this explicit click, and turned into a
  // province name via BigDataCloud's free client-side reverse geocoder.
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum paylaşımını desteklemiyor.")
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=tr`
          )
          const data = await res.json()
          const found =
            data.countryCode === "TR"
              ? normalizeCity(data.principalSubdivision) ?? normalizeCity(data.city)
              : null
          if (found) save(found)
          else setError("Konumunuz Türkiye'deki bir ille eşleşmedi, listeden seçebilirsiniz.")
        } catch {
          setError("Konum alınamadı, listeden seçebilirsiniz.")
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setError("Konum izni verilmedi, listeden seçebilirsiniz.")
      },
      { timeout: 10000 }
    )
  }

  return (
    <div className="relative mb-3">
      <div className="flex flex-wrap items-center gap-x-2 text-sm text-black/70">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
        </svg>
        <span className="font-medium text-black" data-testid="hero-city">
          {city ? `${city}, TR` : "Türkiye geneline teslimat"}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="underline underline-offset-4 hover:text-black"
          data-testid="hero-change-city"
        >
          {city ? "Şehri değiştirin" : "Şehrinizi seçin"}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-black/10 bg-white p-4 shadow-lg">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex h-11 w-full items-center justify-center gap-x-2 rounded-lg bg-black text-sm font-medium text-white disabled:opacity-60"
          >
            {locating ? "Konum alınıyor..." : "Konumumu kullan"}
          </button>
          <div className="my-3 flex items-center gap-x-3 text-xs text-black/40">
            <span className="h-px flex-1 bg-black/10" />
            veya
            <span className="h-px flex-1 bg-black/10" />
          </div>
          <select
            defaultValue={city ?? ""}
            onChange={(e) => e.target.value && save(e.target.value)}
            className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-black focus:outline-none focus:border-black"
            aria-label="İl seçin"
          >
            <option value="" disabled>
              İl seçin
            </option>
            {TURKISH_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default CityPicker
