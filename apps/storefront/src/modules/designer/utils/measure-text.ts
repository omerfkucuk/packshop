// Shared canvas-measureText plumbing - used to derive a fresh text
// element's initial aspect ratio (computeTextAspectSize in apply-design.ts),
// to re-measure an existing one after an on-canvas inline edit
// (designer-shell's handleTextEdit), and to convert a resolved element's
// tight ink-height back into the actual SVG font-size that renders it
// (dieline-preview). All three call sites share one convention for what
// "the size of this text" means, so the selection/drag box always hugs
// the real rendered glyphs, at any size - see fontSizeForInkHeight below
// for why that conversion has to happen at all.

export interface TextMeasurement {
  width: number
  height: number
}

// Representative sample strings for measuring a font's own "ink fraction"
// (how much of its full em-square the rendered glyphs actually fill) -
// includes both a cap-height ascender and a descender so the fraction
// reflects a typical line of text, not one specific word's own metrics
// (a lucky word with no descender would otherwise measure "taller" than
// one with a 'g' in it, purely by chance). Uppercase text never has
// descenders (the transform removes them), so it gets its own fraction.
const INK_SAMPLE_MIXED_CASE = "Ag"
const INK_SAMPLE_UPPERCASE = "AG"

// Arbitrary but large-enough reference font size for a stable, subpixel-
// accurate measurement - only ever used as the denominator of a ratio, so
// its absolute value doesn't matter.
const REFERENCE_PX = 100

// Lazily created (canvas is browser-only) and reused across calls - a
// fresh <canvas> per measurement would work too, just wastefully.
let measureCanvasCtx: CanvasRenderingContext2D | null | undefined

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCanvasCtx !== undefined) return measureCanvasCtx
  measureCanvasCtx =
    typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")
  return measureCanvasCtx
}

function measureInkHeight(
  fontFamily: string,
  fontWeight: number,
  fontSizePx: number,
  uppercase: boolean
): number | null {
  const ctx = getMeasureContext()
  if (!ctx) return null // SSR, or no canvas support

  ctx.font = `${fontWeight} ${fontSizePx}px "${fontFamily}"`
  const metrics = ctx.measureText(uppercase ? INK_SAMPLE_UPPERCASE : INK_SAMPLE_MIXED_CASE)
  const height =
    (metrics.actualBoundingBoxAscent || fontSizePx * 0.7) +
    (metrics.actualBoundingBoxDescent || fontSizePx * 0.2)
  return height > 0 ? height : null
}

// The real, tight size `text` renders at, at a given font/weight/pixel
// size: WIDTH is text-specific (measured directly, no way around that -
// different words are different widths); HEIGHT is the font's own
// conventional ink-height (see measureInkHeight above), not this specific
// string's own bounding box, so two different words in the same font
// always agree on "how tall is a line of this text". `fontSizePx` is in
// the SAME units as the designer's SVG user-space (1 unit == 1mm
// throughout this module), so the returned Dimensions are directly usable
// as a ResolvedElement size at that exact font size.
export function measureText(
  text: string,
  fontFamily: string,
  fontWeight: number,
  fontSizePx: number,
  uppercase: boolean
): TextMeasurement | null {
  const ctx = getMeasureContext()
  if (!ctx) return null

  ctx.font = `${fontWeight} ${fontSizePx}px "${fontFamily}"`
  const width = ctx.measureText(uppercase ? text.toUpperCase() : text).width
  const height = measureInkHeight(fontFamily, fontWeight, fontSizePx, uppercase)
  if (!(width > 0) || !height) return null

  return { width, height }
}

// The inverse of measureInkHeight: the SVG font-size (em value) that makes
// this font/weight/case's rendered ink height equal exactly
// `targetInkHeight`. Needed because a ResolvedElement's size.h is always
// the TIGHT ink-height (so the selection/drag box hugs the glyphs, not
// the font's full em-square line height) - but SVG's own font-size
// attribute expects an em value, which is always somewhat LARGER than the
// ink height it produces (how much larger varies by font/weight/case).
// Setting font-size straight to size.h under-renders the text, leaving an
// empty margin around it that grows right along with the box on every
// resize - exactly the gap this function exists to close.
export function fontSizeForInkHeight(
  fontFamily: string,
  fontWeight: number,
  uppercase: boolean,
  targetInkHeight: number
): number {
  const inkHeightAtReference = measureInkHeight(fontFamily, fontWeight, REFERENCE_PX, uppercase)
  if (!inkHeightAtReference) return targetInkHeight // best-effort fallback, no canvas support
  return targetInkHeight / (inkHeightAtReference / REFERENCE_PX)
}
