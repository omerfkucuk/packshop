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

// The one and only place text gets uppercased - dieline-preview's render
// and the combo picker's previews both call this directly (never CSS
// text-transform) so the string that actually gets DRAWN is character-for-
// character identical to the string measureText below sized the box
// against. Those two used to disagree: canvas measurement called a plain
// text.toUpperCase() while the canvas <text> element relied on CSS
// text-transform: uppercase to do its own, separate uppercasing - and
// Turkish text is exactly where the two diverge (a plain "i" uppercases to
// a Turkish "İ" under locale-aware casing but a plain dotless "I" under
// the CSS/default Unicode mapping some browsers use), so a phrase like
// "İyi Günlerde Kullanın" measured one width but rendered a visibly
// different one - the box no longer matched what was actually drawn.
// tr-TR is hardcoded (not just .toUpperCase()) since this app is Turkish-
// first and its own sample phrases are Turkish; a plain .toUpperCase()
// would "fix" the mismatch just as well but render the linguistically
// wrong dotless İ for Turkish customers.
export function applyTextCase(text: string, uppercase: boolean): string {
  return uppercase ? text.toLocaleUpperCase("tr-TR") : text
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
  const width = ctx.measureText(applyTextCase(text, uppercase)).width
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
// Turkish extended-Latin characters - Google Fonts splits each family
// into several @font-face rules, one per unicode-range subset (latin,
// latin-ext, cyrillic, ...), lazily fetched only once something actually
// needs a codepoint from that subset. GoogleFontLoader's <link rel=
// stylesheet"> registers the RULES but doesn't force any of them to
// actually download; a canvas measureText() call is synchronous and has
// no way to wait for a subset it suddenly needs mid-call, so it silently
// measures against a fallback font instead - exactly what happened to a
// combo whose sample phrase has Turkish-only characters (İ, Ğ, Ü, ...):
// its box was sized against the WRONG font's metrics, while the real
// <text> element (an on-screen DOM node, which CAN wait a paint or two
// for a subset to arrive) rendered correctly a moment later - box and
// glyphs never agreed. This sample forces the latin-ext subset to be the
// one requested below, for every font this app uses, regardless of
// whether a given customer's own text happens to need it.
const TURKISH_WARMUP_SAMPLE = "İıĞğÜüŞşÖöÇç"

// Confirms `fontFamily`/`fontWeight` is actually ready for canvas
// measurement (not just CSS rendering) before anything trusts a
// measurement against it - see the comment above for why those two can
// otherwise disagree. Retries briefly: GoogleFontLoader's <link> may not
// have finished loading (its @font-face rules not registered yet) by the
// time this is first called, so document.fonts.load() can reject even for
// a font that's genuinely about to be available a moment later. Resolves
// `true` on confirmed success; on repeated failure (or no Font Loading API
// support at all) resolves `true` anyway after giving up, rather than
// blocking a picker button forever over one bad load.
export async function warmUpFont(fontFamily: string, fontWeight: number): Promise<boolean> {
  if (typeof document === "undefined" || !("fonts" in document)) return true

  const spec = `${fontWeight} 16px "${fontFamily}"`
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const loaded = await document.fonts.load(spec, TURKISH_WARMUP_SAMPLE)
      if (loaded.length > 0) return true
    } catch {
      // @font-face not registered yet, or a genuine load failure - retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return true // best-effort - don't block the UI forever over one bad load
}

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
