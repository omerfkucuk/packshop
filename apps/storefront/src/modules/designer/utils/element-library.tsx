import type { ReactNode } from "react"

// Hand-authored placeholder catalog, proving the full pipeline (picker ->
// selection -> theme slot -> brand-color recolor -> canvas render) end to
// end - swap/extend with real designed assets later, same shape.
//
// Every recolorable entry's markup must use fill="currentColor" (or
// stroke="currentColor") throughout: it's embedded once as an SVG <symbol>
// and referenced via <use style={{ color }}>, so `currentColor` is what
// lets the same symbol render in the picker's ambient text color AND in
// any brand color on the canvas, with no extra code either place.

export type LibraryElementCategory = "icon" | "shape" | "pattern"

export interface LibraryElement {
  id: string
  label: string
  category: LibraryElementCategory
  viewBox: string
  markup: ReactNode
  recolorable: boolean
}

export const ELEMENT_LIBRARY: LibraryElement[] = [
  {
    id: "three-circles",
    label: "Üç Daire",
    category: "pattern",
    viewBox: "0 0 100 100",
    recolorable: true,
    markup: (
      <>
        <circle cx="35" cy="40" r="30" fill="currentColor" opacity={0.85} />
        <circle cx="65" cy="35" r="22" fill="currentColor" opacity={0.85} />
        <circle cx="55" cy="65" r="18" fill="currentColor" opacity={0.85} />
      </>
    ),
  },
  {
    id: "leaf",
    label: "Yaprak",
    category: "shape",
    viewBox: "0 0 100 100",
    recolorable: true,
    markup: (
      <ellipse
        cx="50"
        cy="50"
        rx="42"
        ry="20"
        fill="currentColor"
        transform="rotate(45 50 50)"
      />
    ),
  },
  {
    id: "badge",
    label: "Rozet",
    category: "icon",
    viewBox: "0 0 100 100",
    recolorable: true,
    markup: <rect x="18" y="18" width="64" height="64" rx="16" fill="currentColor" />,
  },
]

export const getLibraryElement = (id: string): LibraryElement | undefined =>
  ELEMENT_LIBRARY.find((entry) => entry.id === id)
