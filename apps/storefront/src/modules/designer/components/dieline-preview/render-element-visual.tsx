import type { ResolvedElement } from "@dtc/layout-engine"
import { getLibraryElement } from "../../utils/element-library"
import { fontSizeForInkHeight, applyTextCase } from "../../utils/measure-text"

// A defensive floor only - guards against a degenerate (near-zero) size.h
// ever producing illegibly tiny or inverted text. No upper cap: the
// rendered font size should be able to grow as large as the customer
// resizes the box to, same as every other element type already can.
export const MIN_TEXT_SIZE = 10

// The actual SVG font-size for a text element, derived from its resolved
// (tight ink-height) size.h - see fontSizeForInkHeight's own comment for
// why this indirection exists. Falls back to the old direct size.h==
// font-size mapping when no font is known (e.g. a brand-social-link text
// element, which never sets content.font) - less precise, but a link
// string doesn't call for pixel-tight framing the way a customer's own
// headline does.
export const textFontSize = (
  size: { h: number },
  font: unknown,
  fontWeight: unknown,
  uppercase: boolean
): number =>
  Math.max(
    MIN_TEXT_SIZE,
    typeof font === "string"
      ? fontSizeForInkHeight(
          font,
          typeof fontWeight === "number" ? fontWeight : 400,
          uppercase,
          size.h
        )
      : size.h
  )

export const isImageLike = (el: ResolvedElement) =>
  el.elementType === "logo" ||
  el.elementType === "image" ||
  el.elementType === "reference-image" ||
  el.elementType === "ai-generated"

// One source of truth for "how does element X actually render" - shared by
// DielinePreview's live 2D SVG (flip scoped to the whole dieline) and the
// 3D preview's per-panel texture generator (flip scoped to one panel's own
// zone, see utils/panel-texture.ts). Each caller computes its own flip and
// hands this function plain, already-flipped coordinates; it never needs
// to know which one it's being called from. A second, independent
// reimplementation of this switch (e.g. a from-scratch canvas-2D redraw)
// would be exactly the kind of drift the manual-override merge bug (fixed
// twice earlier in this project) already showed the cost of.
//
// `x`/`y` are the element's already-flipped top-left corner (used for
// image/library-element positioning); `textCenterX`/`textCenterY` are its
// already-flipped CENTER (text is anchored/baselined from its middle, not
// its corner).
export function renderElementVisual(
  el: ResolvedElement,
  x: number,
  y: number,
  textCenterX: number,
  textCenterY: number,
  size: { w: number; h: number }
): React.ReactNode | null {
  if (isImageLike(el)) {
    const url = el.content.url
    if (typeof url !== "string") return null
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <image
        href={url}
        x={x}
        y={y}
        width={size.w}
        height={size.h}
        preserveAspectRatio="xMidYMid meet"
      />
    )
  }

  if (el.elementType === "text") {
    const text = el.content.text
    const font = el.content.font
    const fontWeight = el.content.fontWeight
    const uppercase = el.content.uppercase === true
    if (typeof text !== "string") return null
    const fontSize = textFontSize(size, font, fontWeight, uppercase)
    return (
      <text
        x={textCenterX}
        y={textCenterY}
        fontSize={fontSize}
        fontFamily={typeof font === "string" ? font : undefined}
        fontWeight={typeof fontWeight === "number" ? fontWeight : undefined}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#000"
      >
        {applyTextCase(text, uppercase)}
      </text>
    )
  }

  if (
    el.elementType === "icon" ||
    el.elementType === "shape" ||
    el.elementType === "pattern"
  ) {
    const libraryElementId = el.content.libraryElementId
    const entry =
      typeof libraryElementId === "string" ? getLibraryElement(libraryElementId) : undefined
    if (!entry) return null
    const color = typeof el.content.color === "string" ? el.content.color : undefined
    return (
      <use
        href={`#library-element-${entry.id}`}
        x={x}
        y={y}
        width={size.w}
        height={size.h}
        style={entry.recolorable && color ? { color } : undefined}
      />
    )
  }

  // qr/barcode rendering lands with their own element-type plugins later -
  // nothing to draw yet.
  return null
}
