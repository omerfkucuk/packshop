"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const OPTIONS: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Yeni eklenenler" },
  { value: "price_asc", label: "Fiyat: Düşükten yükseğe" },
  { value: "price_desc", label: "Fiyat: Yüksekten düşüğe" },
]

// Compact top-bar sort (Packhelp-style) instead of the sidebar radio list.
const SortSelect = ({ sortBy }: { sortBy: SortOptions }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sortBy", value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-x-2 text-sm text-black/60">
      <span className="hidden xsmall:inline">Sırala</span>
      <select
        value={sortBy}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-black/15 bg-white px-3 text-sm text-black focus:outline-none focus:border-black"
        data-testid="sort-by-container"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default SortSelect
