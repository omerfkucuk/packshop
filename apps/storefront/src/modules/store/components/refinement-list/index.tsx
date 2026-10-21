"use client"

import { XMark } from "@medusajs/icons"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import OptionsPicker from "./options-picker"
import { SortOptions } from "./sort-products"

type RefinementListProps = {
  /** Sorting now lives in the grid's top bar (SortSelect); kept for callers. */
  sortBy?: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  /**
   * "sidebar": desktop filter column only. "mobile": just the Filtrele
   * button + bottom sheet, meant to sit inside the grid's top bar so it
   * lines up with the sort dropdown.
   */
  variant?: "sidebar" | "mobile"
  "data-testid"?: string
}

// Option filters: a sidebar of collapsed groups on desktop, a "Filtrele"
// button opening a bottom sheet on mobile.
const RefinementList = ({ hideOptionsPicker = false, variant = "sidebar" }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const setOptionValueIds = useCallback(
    (valueIds: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) => params.append(OPTION_VALUE_QUERY_KEY, valueId))
      params.delete("page")
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

  // Lock page scroll behind the sheet.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [sheetOpen])

  if (hideOptionsPicker) {
    return null
  }

  const count = selectedOptionValueIds.length

  if (variant === "sidebar") {
    return (
      <aside className="hidden small:block small:w-[240px] shrink-0 small:mr-10">
        <OptionsPicker
          selectedValueIds={selectedOptionValueIds}
          setOptionValueIds={setOptionValueIds}
        />
      </aside>
    )
  }

  return (
    <>
      <div className="small:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-10 w-full items-center justify-center gap-x-2 rounded-lg border border-black/15 bg-white px-4 text-sm font-medium text-black"
          data-testid="open-filters-button"
        >
          Filtrele{count > 0 && ` (${count})`}
        </button>
      </div>

      {sheetOpen && (
        <div className="small:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Filtreleri kapat"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative flex max-h-[85vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <span className="text-base font-semibold text-black">Filtreler</span>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Kapat">
                <XMark />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <OptionsPicker
                selectedValueIds={selectedOptionValueIds}
                setOptionValueIds={setOptionValueIds}
              />
            </div>
            <div className="flex gap-3 border-t border-black/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setOptionValueIds([])}
                disabled={count === 0}
                className="h-12 flex-1 rounded-full border border-black/15 text-sm font-medium text-black disabled:opacity-40"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="h-12 flex-1 rounded-full bg-black text-sm font-medium text-white"
              >
                Sonuçları göster
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RefinementList
