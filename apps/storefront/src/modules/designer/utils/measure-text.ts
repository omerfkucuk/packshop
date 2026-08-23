// Shared canvas-measureText plumbing - used both to derive a fresh text
// element's initial aspect ratio (computeTextAspectSize in apply-design.ts)
// and to re-measure an existing one after an on-canvas inline edit
// (designer-shell's handleTextEdit). One canvas, one measuring function,
// so both call sites agree on exactly how "the real size of this text" is
// defined.

export interface TextMeasurement {
  width: number
  height: number
}

// Lazily created (canvas is browser-only) and reused across calls - a
// fresh <canvas> per measurement would work too, just wastefully.
let measureCanvasCtx: CanvasRenderingContext2D | null | undefined

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCanvasCtx !== undefined) return measureCanvasCtx
  measureCanvasCtx =
    typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")
  return measureCanvasCtx
}

// The real, tight rendered size of `text` at a given font/weight/pixel
// size - canvas measureText's actualBoundingBoxAscent/Descent give an
// ink-height bounding box, not the full em-square line-height a naive
// fontSize-as-height assumption would use. `fontSizePx` is in the SAME
// units as the designer's SVG user-space (1 unit == 1mm throughout this
// module), so the returned Dimensions are directly usable as a
// ResolvedElement size at that exact font size - no separate mm<->px
// conversion needed.
export function measureText(
  text: string,
  fontFamily: string,
  fontWeight: number,
  fontSizePx: number,
  uppercase: boolean
): TextMeasurement | null {
  const ctx = getMeasureContext()
  if (!ctx) return null // SSR, or no canvas support

  ctx.font = `${fontWeight} ${fontSizePx}px "${fontFamily}"`
  const metrics = ctx.measureText(uppercase ? text.toUpperCase() : text)

  const width = metrics.width
  const height =
    (metrics.actualBoundingBoxAscent || fontSizePx * 0.7) +
    (metrics.actualBoundingBoxDescent || fontSizePx * 0.2)
  if (!(width > 0) || !(height > 0)) return null

  return { width, height }
}
