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
    // Tightly cropped to the three circles' own combined bounding box - a
    // loose viewBox (originally "0 0 100 100") left empty padding baked
    // into the symbol itself, so the drag/resize frame (which tracks this
    // box) never actually hugged the visible artwork, however far it was
    // dragged/resized. The placement engine always sizes library elements
    // into a SQUARE box (no natural-aspect-ratio info flows through for
    // them, unlike an uploaded logo's real pixel size), so the two circles'
    // cy are nudged 4.5mm apart from the original layout to make the
    // bounding box exactly square too - otherwise a non-square crop would
    // still letterbox inside that square box, just a smaller gap than
    // before instead of none.
    viewBox: "5 5.5 82 82",
    recolorable: true,
    markup: (
      <>
        <circle cx="35" cy="35.5" r="30" fill="currentColor" opacity={0.85} />
        <circle cx="65" cy="35" r="22" fill="currentColor" opacity={0.85} />
        <circle cx="55" cy="69.5" r="18" fill="currentColor" opacity={0.85} />
      </>
    ),
  },
  {
    id: "leaf",
    label: "Yaprak",
    category: "shape",
    // Tightly cropped to the rotated ellipse's own bounding box - same
    // reasoning as three-circles above.
    viewBox: "17.1 17.1 65.8 65.8",
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
    // Tightly cropped to the rect's own bounds - same reasoning as
    // three-circles above.
    viewBox: "18 18 64 64",
    recolorable: true,
    markup: <rect x="18" y="18" width="64" height="64" rx="16" fill="currentColor" />,
  },
]

export const getLibraryElement = (id: string): LibraryElement | undefined =>
  ELEMENT_LIBRARY.find((entry) => entry.id === id)
