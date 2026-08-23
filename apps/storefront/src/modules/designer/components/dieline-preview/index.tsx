"use client"

import { useEffect, useRef, useState } from "react"
import type { PanelGeometry, Point, ZoneLike } from "@dtc/packaging-engine/shared"
import { zoneOrigin, deriveWrapZones, type WrapZone } from "@dtc/packaging-engine/placement"
import type { ElementType, ResolvedLayout, ResolvedElement } from "@dtc/layout-engine"
import { noElementOverlapRule, elementsTouchingPanel } from "@dtc/layout-engine/constraints"
import { ELEMENT_LIBRARY, getLibraryElement } from "../../utils/element-library"
import { fontSizeForInkHeight } from "../../utils/measure-text"

type DielinePreviewProps = {
  panels: PanelGeometry[]
  resolvedLayout?: ResolvedLayout | null
  backgroundColors?: Record<string, string>
  className?: string
  /** Fires once, on release, with the element's final mm position and the
   *  (physical) panel it ends up on - not on every pointermove (the live
   *  drag preview is local component state, so it doesn't need to
   *  round-trip through the parent's render on every frame). The panel can
   *  differ from the one the element started on: dragging past a panel's
   *  edge moves it onto whichever panel the pointer is over, since every
   *  main panel sits side by side in this same flat mm space.
   *  `secondaryPanelName` is a REQUIRED argument (not optional/omittable),
   *  always `undefined` when not wrapping - passing it explicitly on every
   *  call is what lets dragging back off a valid seam (see
   *  @dtc/packaging-engine's WrapZone) actually clear a previous wrap,
   *  rather than a spread-merge silently keeping it stale. Omit onDragEnd
   *  entirely to render a non-interactive preview. */
  onDragEnd?: (
    elementId: string,
    position: Point,
    panelName: string,
    secondaryPanelName: string | undefined
  ) => void
  /** Fires once, on release, after dragging a corner handle - the
   *  recentered position, new (aspect-ratio-preserved, zone-clamped) size,
   *  the panel the resize happened on, and (same non-optional semantics as
   *  onDragEnd's secondaryPanelName) whether growing across a valid seam
   *  turned it into a wrap. Selecting an element (which shows the handles)
   *  piggybacks on the same pointer interaction as drag, so pass both
   *  together. */
  onResize?: (
    elementId: string,
    position: Point,
    size: { w: number; h: number },
    panelName: string,
    secondaryPanelName: string | undefined
  ) => void
  /** Fires when the selected element's delete button is clicked, or
   *  Delete/Backspace is pressed while it's selected (and no text input
   *  elsewhere on the page has focus). Selecting an element requires
   *  onDragEnd; showing the delete affordance additionally requires this. */
  onDeleteElement?: (elementId: string) => void
  /** Fires once, on commit (Enter or blur out of the inline editor), with
   *  the element's own elementId (NOT sourceElementId - unlike delete,
   *  editing one physical instance of a repeated slogan should only ever
   *  change that one instance, not every panel's copy) and the new text.
   *  Double-clicking a text element (only text - logos/library elements
   *  aren't editable this way) starts editing; requires this AND a text
   *  elementType to show the inline editor at all. */
  onEditText?: (elementId: string, newText: string) => void
}

type DragState = {
  elementId: string
  elementType: ElementType
  panelName: string
  /** The second panel this drag currently wraps onto, if any - see
   *  resolveWrapClamp below. Seeded from the element's already-committed
   *  ResolvedElement.secondaryPanelName at pointerdown, so re-dragging an
   *  already-wrapped element starts the hysteresis in the right state
   *  instead of snapping back to single-panel for the gesture's first
   *  frame. */
  secondaryPanelName?: string
  size: { w: number; h: number }
  pointerStart: Point // root <svg> user space (mm-numeric, Y-down)
  elementStart: Point // mm space, Y-up - same convention as ResolvedElement.position
  current: Point // mm space, Y-up - the live, clamped drag position
}

type CornerHandle = "tl" | "tr" | "bl" | "br"

type ResizeState = {
  elementId: string
  elementType: ElementType
  panelName: string
  /** Same meaning as DragState.secondaryPanelName. Unlike drag, `panelName`
   *  itself never changes mid-gesture (the anchor corner is fixed, so only
   *  the growing far corner can ever reach a neighbor) - only this field
   *  toggles as the gesture crosses the enter/exit hysteresis band. */
  secondaryPanelName?: string
  handle: CornerHandle
  anchor: Point // mm - the opposite corner, fixed for the whole gesture
  originalSize: { w: number; h: number } // mm, at gesture start - defines the aspect ratio kept throughout
  current: { position: Point; size: { w: number; h: number } }
}

// The corner diagonally opposite each handle - it's what stays fixed while
// that handle is dragged (position/size describe the ORIGINAL box, at
// gesture start).
const CORNER_ANCHOR: Record<
  CornerHandle,
  (position: Point, size: { w: number; h: number }) => Point
> = {
  tl: (position, size) => ({ x: position.x + size.w, y: position.y }), // bottom-right
  tr: (position, size) => ({ x: position.x, y: position.y }), // bottom-left
  bl: (position, size) => ({ x: position.x + size.w, y: position.y + size.h }), // top-right
  br: (position, size) => ({ x: position.x, y: position.y + size.h }), // top-left
}

// Which mm direction (away from the anchor) each handle grows toward.
const CORNER_GROWTH_SIGN: Record<CornerHandle, { dx: 1 | -1; dy: 1 | -1 }> = {
  tl: { dx: -1, dy: 1 },
  tr: { dx: 1, dy: 1 },
  bl: { dx: -1, dy: -1 },
  br: { dx: 1, dy: -1 },
}

const toPolylinePoints = (points: Point[]) =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

// A defensive floor only - guards against a degenerate (near-zero) size.h
// ever producing illegibly tiny or inverted text. No upper cap: the
// rendered font size should be able to grow as large as the customer
// resizes the box to, same as every other element type already can.
// Exported so the designer shell can derive the exact same font-size a
// text element is currently rendering at (e.g. to re-measure it after an
// on-canvas edit) without hand-copying this number.
export const MIN_TEXT_SIZE = 10

// The actual SVG font-size for a text element, derived from its resolved
// (tight ink-height) size.h - see fontSizeForInkHeight's own comment for
// why this indirection exists. Falls back to the old direct size.h==
// font-size mapping when no font is known (e.g. a brand-social-link text
// element, which never sets content.font) - less precise, but a link
// string doesn't call for pixel-tight framing the way a customer's own
// headline does.
const textFontSize = (
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

const isImageLike = (el: ResolvedElement) =>
  el.elementType === "logo" ||
  el.elementType === "image" ||
  el.elementType === "reference-image" ||
  el.elementType === "ai-generated"

// Everything except text is allowed to bleed to the panel's true physical
// edge (see fullPanelBounds below) - a logo/shape/pattern/icon/image
// printed right up to the cut line is normal, but text that close risks
// being clipped or folded through, so it keeps the print-safe margin.
const canBleedToPanelEdge = (elementType: ElementType) => elementType !== "text"

// qr/barcode physically can't be scanned once split across a fold -
// excluded from wrapping onto a neighbor panel regardless of how far
// they're dragged/resized. Everything else (logo/image/reference-image/
// ai-generated/shape/pattern/icon/text) is wrap-eligible.
const canWrapAcrossPanels = (elementType: ElementType) =>
  elementType !== "qr" && elementType !== "barcode"

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

const zoneBounds = (zone: ZoneLike): Bounds => {
  const origin = zoneOrigin(zone)
  return {
    minX: origin.x,
    minY: origin.y,
    maxX: origin.x + zone.boundingBox.w,
    maxY: origin.y + zone.boundingBox.h,
  }
}

// Expands a print zone's (already safety-inset) bounds back out to the
// panel's true physical edge, using the same insets that were subtracted
// to build the zone in the first place (see PRINT_SAFE_MARGIN_MM in
// fefco-0201.ts). Falls back to the zone's own bounds if a zone has no
// safeInsets recorded.
const fullPanelBounds = (zone: ZoneLike): Bounds => {
  const bounds = zoneBounds(zone)
  const insets = zone.safeInsets
  if (!insets) return bounds
  return {
    minX: bounds.minX - insets.left,
    minY: bounds.minY - insets.bottom,
    maxX: bounds.maxX + insets.right,
    maxY: bounds.maxY + insets.top,
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

// Below this mm-space movement, a pointerdown->pointerup on the element
// body is treated as a click (toggling selection) rather than a drag
// commit.
const CLICK_THRESHOLD_MM = 1.5
const MIN_ELEMENT_SIZE_MM = 8

// Flat 2D render of a generated dieline: cut lines solid black, crease lines
// dashed gray, print zones lightly shaded (or the resolved layout's chosen
// background color). Coordinates come from @dtc/packaging-engine/
// @dtc/layout-engine in a Y-up mm space; SVG is Y-down, so the geometry
// (pure lines/polygons, safe to flip as-is) renders inside a
// vertically-flipped <g>. Painted content - images, text, library elements
// - would render upside down under that same flip, so their positions are
// pre-flipped by hand instead and drawn in a normal, unflipped <g> on top.
//
// The root <svg> itself carries no transform, so its own user space (what
// getScreenCTM() below resolves against) is Y-down and numerically
// identical to mm space on X, and to flipY(mmY) on Y - see toSvgPoint().
const DielinePreview = ({
  panels,
  resolvedLayout,
  backgroundColors,
  className,
  onDragEnd,
  onResize,
  onDeleteElement,
  onEditText,
}: DielinePreviewProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  // Not cleared when the element disappears from a new resolvedLayout (a
  // stale id here is harmless - the render loop below only shows resize
  // handles for elements it's actually iterating over).
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  // Which text element (by its own elementId, not sourceElementId) is
  // currently showing its inline <input> editor, and the in-progress value
  // typed into it - separate from the element's own committed
  // content.text, which only updates once the edit is committed.
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  const startEditingText = (el: ResolvedElement) => {
    if (!onEditText) return
    setSelectedElementId(null)
    setEditingElementId(el.elementId)
    setEditingText(typeof el.content.text === "string" ? el.content.text : "")
  }

  const commitTextEdit = () => {
    if (editingElementId) {
      onEditText?.(editingElementId, editingText)
    }
    setEditingElementId(null)
  }

  const cancelTextEdit = () => setEditingElementId(null)

  // Delete/Backspace deletes the selected element, unless some other text
  // input on the page currently has focus (editing a brand name, typing
  // the AI prompt, ...) - a global keydown listener would otherwise delete
  // canvas content while the customer is just trying to hit backspace in a
  // form field.
  useEffect(() => {
    if (!selectedElementId || !onDeleteElement) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return
      const active = document.activeElement
      const isEditableFocused =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      if (isEditableFocused) return

      e.preventDefault()
      // Same sourceElementId lookup as the on-canvas delete button - see
      // its comment below for why elementId alone isn't always right.
      const selectedEl = (resolvedLayout?.panels ?? [])
        .flatMap((p) => p.elements)
        .find((el) => el.elementId === selectedElementId)
      onDeleteElement(selectedEl?.sourceElementId ?? selectedElementId)
      setSelectedElementId(null)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedElementId, onDeleteElement, resolvedLayout])

  const allPoints = panels.flatMap((panel) =>
    [...panel.cutLines, ...panel.creaseLines].flat()
  )

  if (allPoints.length === 0) {
    return null
  }

  const minX = Math.min(...allPoints.map((p) => p.x))
  const maxX = Math.max(...allPoints.map((p) => p.x))
  const minY = Math.min(...allPoints.map((p) => p.y))
  const maxY = Math.max(...allPoints.map((p) => p.y))
  const flipY = (y: number) => minY + maxY - y

  const padding = Math.max(maxX - minX, maxY - minY) * 0.05
  const viewBox = `${minX - padding} ${minY - padding} ${
    maxX - minX + padding * 2
  } ${maxY - minY + padding * 2}`
  // A fixed mm size would render as a speck on a large box and a boulder on
  // a small one - sized relative to the overall diagram instead, same idea
  // as `padding` above.
  const handleRadius = padding * 0.15

  const elementsByPanel = new Map(
    (resolvedLayout?.panels ?? []).map((p) => [
      p.panelName,
      [...p.elements].sort((a, b) => a.zIndex - b.zIndex),
    ])
  )

  const zoneFor = (panelName: string) =>
    panels.find((p) => p.panelName === panelName)?.printZones[0]

  // Which physical panel's print zone a raw (unclamped) mm point falls
  // inside - every main panel of this box sits side by side in the same
  // flat mm space (confirmed by this file's own viewBox spanning all of
  // them at once), so "dragged onto a different panel" is just "the point
  // is now inside a different zone's bounding box," no per-panel transform
  // math needed.
  const findPanelAt = (point: Point): PanelGeometry | undefined =>
    panels.find((panel) => {
      const zone = panel.printZones[0]
      if (!zone) return false
      const origin = zoneOrigin(zone)
      return (
        point.x >= origin.x &&
        point.x <= origin.x + zone.boundingBox.w &&
        point.y >= origin.y &&
        point.y <= origin.y + zone.boundingBox.h
      )
    })

  // Every valid adjacent-main-panel seam this box supports, keyed by its
  // sorted panel-name pair - recomputed each render like elementsByPanel/
  // zoneFor above (cheap: O(panels^2) over ~5 panels).
  const pairKey = (a: string, b: string) => [a, b].sort().join("|")
  const wrapZoneByPair = new Map<string, WrapZone>(
    deriveWrapZones(panels).map((wz) => [pairKey(wz.panels[0], wz.panels[1]), wz])
  )

  // Every main panel whose print zone the raw (unclamped) box's full AABB
  // overlaps at all - unlike findPanelAt (a single point), this is how a
  // box that's now straddling a seam gets detected as touching TWO panels
  // at once.
  const findOverlappingPanels = (box: Bounds): PanelGeometry[] =>
    panels.filter((panel) => {
      const zone = panel.printZones[0]
      if (!zone) return false
      const b = zoneBounds(zone)
      return box.minX < b.maxX && box.maxX > b.minX && box.minY < b.maxY && box.maxY > b.minY
    })

  // Fraction of the box's own extent along a WrapZone's seam axis that
  // must already sit over the NEIGHBOR panel to (a) start wrapping, or
  // stay above to (b) keep an active wrap alive. Two different thresholds
  // (rather than one) are the hysteresis band: a small pointer jitter
  // right at a single fixed boundary can't flip the state every frame.
  // Expressed as a fraction of the box's own size (not an absolute mm
  // value) so a small icon and a large banner both need to travel "the
  // same relative amount" onto the neighbor to feel consistent.
  const WRAP_ENTER_OVERLAP_FRACTION = 0.15
  const WRAP_EXIT_OVERLAP_FRACTION = 0.08

  // Decides whether a raw (unclamped) candidate box should clamp against a
  // single panel (today's long-standing behavior) or against a WrapZone
  // spanning `primaryPanelName` and a neighbor - and if the latter, which
  // panel is the "secondary" one. `primaryPanelName` is the element's panel
  // identity for this gesture: drag re-picks it every pointermove (via
  // findPanelAt on the box's center, same as before this feature existed),
  // while resize keeps it fixed to the panel the gesture started on, since
  // only the growing far corner can ever reach into a neighbor.
  const resolveWrapClamp = (
    rawBox: Bounds,
    elementType: ElementType,
    primaryPanelName: string,
    currentSecondaryPanelName: string | undefined
  ): { secondaryPanelName: string | undefined; bounds: Bounds } => {
    const singlePanel = (panelName: string) => {
      const zone = zoneFor(panelName)
      const bounds = zone
        ? canBleedToPanelEdge(elementType)
          ? fullPanelBounds(zone)
          : zoneBounds(zone)
        : rawBox
      return { secondaryPanelName: undefined, bounds }
    }

    if (!canWrapAcrossPanels(elementType)) return singlePanel(primaryPanelName)

    const overlapping = findOverlappingPanels(rawBox)
    if (overlapping.length !== 2) return singlePanel(primaryPanelName)

    const primaryCandidate = overlapping.find((p) => p.panelName === primaryPanelName)
    if (!primaryCandidate) {
      // The box no longer touches its nominal primary panel at all - fall
      // back to single-panel against whichever panel it's actually over,
      // same as the always-single-panel path already did.
      return singlePanel(overlapping[0].panelName)
    }

    const other = overlapping.find((p) => p.panelName !== primaryPanelName)!
    const wrapZone = wrapZoneByPair.get(pairKey(primaryCandidate.panelName, other.panelName))
    if (!wrapZone) return singlePanel(primaryPanelName)

    const axisIsVertical = wrapZone.seamAxis === "vertical"
    const boxExtent = axisIsVertical ? rawBox.maxX - rawBox.minX : rawBox.maxY - rawBox.minY
    const overlapFraction = (panel: PanelGeometry) => {
      const b = zoneBounds(panel.printZones[0])
      const overlapMin = axisIsVertical ? Math.max(rawBox.minX, b.minX) : Math.max(rawBox.minY, b.minY)
      const overlapMax = axisIsVertical ? Math.min(rawBox.maxX, b.maxX) : Math.min(rawBox.maxY, b.maxY)
      return boxExtent > 0 ? Math.max(0, overlapMax - overlapMin) / boxExtent : 0
    }

    const wasWrapped = currentSecondaryPanelName === other.panelName
    const threshold = wasWrapped ? WRAP_EXIT_OVERLAP_FRACTION : WRAP_ENTER_OVERLAP_FRACTION
    const smallerFraction = Math.min(overlapFraction(primaryCandidate), overlapFraction(other))

    if (smallerFraction < threshold) return singlePanel(primaryPanelName)

    const bounds = canBleedToPanelEdge(elementType) ? fullPanelBounds(wrapZone) : zoneBounds(wrapZone)
    return { secondaryPanelName: other.panelName, bounds }
  }

  const toSvgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return { x: clientX, y: clientY } // defensive, shouldn't hit for a mounted <svg>
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  const handlePointerDown =
    (el: ResolvedElement) => (e: React.PointerEvent<SVGRectElement>) => {
      if (!onDragEnd) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragState({
        elementId: el.elementId,
        elementType: el.elementType,
        panelName: el.panelName,
        secondaryPanelName: el.secondaryPanelName,
        size: el.size,
        pointerStart: toSvgPoint(e.clientX, e.clientY),
        elementStart: el.position,
        current: el.position,
      })
    }

  const handleCornerPointerDown =
    (el: ResolvedElement, handle: CornerHandle) => (e: React.PointerEvent<SVGElement>) => {
      e.stopPropagation()
      if (!onResize) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setResizeState({
        elementId: el.elementId,
        elementType: el.elementType,
        panelName: el.panelName,
        secondaryPanelName: el.secondaryPanelName,
        handle,
        anchor: CORNER_ANCHOR[handle](el.position, el.size),
        originalSize: el.size,
        current: { position: el.position, size: el.size },
      })
    }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (resizeState) {
      const svgPoint = toSvgPoint(e.clientX, e.clientY)
      // svgPoint.x maps 1:1 to mm x; svgPoint.y is flipY(mmY) (an
      // involution), so flipping it back recovers mm y directly - unlike
      // the position-drag below, a corner handle's scale is naturally
      // computed from the pointer's ABSOLUTE distance to the fixed anchor,
      // not a delta, so there's no grab-offset to preserve.
      const pointerMm = { x: svgPoint.x, y: flipY(svgPoint.y) }

      const originalDiag = Math.hypot(resizeState.originalSize.w, resizeState.originalSize.h)
      let scale =
        originalDiag > 0
          ? Math.hypot(
              pointerMm.x - resizeState.anchor.x,
              pointerMm.y - resizeState.anchor.y
            ) / originalDiag
          : 1

      const { dx, dy } = CORNER_GROWTH_SIGN[resizeState.handle]
      const minScale = Math.max(
        MIN_ELEMENT_SIZE_MM / resizeState.originalSize.w,
        MIN_ELEMENT_SIZE_MM / resizeState.originalSize.h
      )

      // A naive (pre-clamp) candidate box from the raw pointer-driven
      // scale - used only to decide whether this gesture has crossed into
      // wrap territory, before maxScale below actually constrains it. The
      // anchor corner never moves during a resize, so `resizeState.panelName`
      // stays fixed for the whole gesture - only whether the growing far
      // corner has reached a valid neighbor toggles.
      const naiveScale = Math.max(scale, minScale)
      const candidateSize = {
        w: resizeState.originalSize.w * naiveScale,
        h: resizeState.originalSize.h * naiveScale,
      }
      const candidateBox: Bounds = {
        minX: dx === 1 ? resizeState.anchor.x : resizeState.anchor.x - candidateSize.w,
        minY: dy === 1 ? resizeState.anchor.y : resizeState.anchor.y - candidateSize.h,
        maxX: dx === 1 ? resizeState.anchor.x + candidateSize.w : resizeState.anchor.x,
        maxY: dy === 1 ? resizeState.anchor.y + candidateSize.h : resizeState.anchor.y,
      }

      const { secondaryPanelName, bounds } = resolveWrapClamp(
        candidateBox,
        resizeState.elementType,
        resizeState.panelName,
        resizeState.secondaryPanelName
      )

      // The anchor is fixed; only the FAR corner (the one being dragged)
      // needs to stay inside the bounds as the box grows away from it.
      const maxScaleX =
        dx === 1
          ? (bounds.maxX - resizeState.anchor.x) / resizeState.originalSize.w
          : (resizeState.anchor.x - bounds.minX) / resizeState.originalSize.w
      const maxScaleY =
        dy === 1
          ? (bounds.maxY - resizeState.anchor.y) / resizeState.originalSize.h
          : (resizeState.anchor.y - bounds.minY) / resizeState.originalSize.h
      const maxScale = Math.min(maxScaleX, maxScaleY)
      scale = clamp(scale, minScale, Math.max(minScale, maxScale))

      const newSize = {
        w: resizeState.originalSize.w * scale,
        h: resizeState.originalSize.h * scale,
      }
      const newPosition = {
        x: dx === 1 ? resizeState.anchor.x : resizeState.anchor.x - newSize.w,
        y: dy === 1 ? resizeState.anchor.y : resizeState.anchor.y - newSize.h,
      }

      setResizeState((prev) =>
        prev
          ? { ...prev, current: { position: newPosition, size: newSize }, secondaryPanelName }
          : prev
      )
      return
    }

    if (!dragState) return
    const current = toSvgPoint(e.clientX, e.clientY)
    const dxSvg = current.x - dragState.pointerStart.x
    const dySvg = current.y - dragState.pointerStart.y
    // x maps 1:1 svg->mm; y inverts (svgY = flipY(mmY) is an involution) -
    // an on-screen downward drag must SUBTRACT from mm y (Y-up), not add.
    const rawX = dragState.elementStart.x + dxSvg
    const rawY = dragState.elementStart.y - dySvg

    // Which panel to clamp against is decided by the element's own
    // (unclamped) CENTER point, not dragState.panelName - crossing into
    // another panel's zone re-targets the drag onto it. Falls back to
    // whichever panel it's currently on if the pointer strays over a
    // crease/flap/margin between zones, so it doesn't jump erratically.
    const rawCenter = { x: rawX + dragState.size.w / 2, y: rawY + dragState.size.h / 2 }
    const targetPanel = findPanelAt(rawCenter) ?? panels.find((p) => p.panelName === dragState.panelName)
    const primaryPanelName = targetPanel?.panelName ?? dragState.panelName
    const rawBox: Bounds = {
      minX: rawX,
      minY: rawY,
      maxX: rawX + dragState.size.w,
      maxY: rawY + dragState.size.h,
    }

    const { secondaryPanelName, bounds } = resolveWrapClamp(
      rawBox,
      dragState.elementType,
      primaryPanelName,
      dragState.secondaryPanelName
    )
    const clamped = {
      x: clamp(rawX, bounds.minX, bounds.maxX - dragState.size.w),
      y: clamp(rawY, bounds.minY, bounds.maxY - dragState.size.h),
    }

    setDragState((prev) =>
      prev ? { ...prev, current: clamped, panelName: primaryPanelName, secondaryPanelName } : prev
    )
  }

  const endDrag = () => {
    if (dragState) {
      const dx = dragState.current.x - dragState.elementStart.x
      const dy = dragState.current.y - dragState.elementStart.y
      if (Math.hypot(dx, dy) < CLICK_THRESHOLD_MM) {
        // Barely moved (or didn't) - a click/tap, not a drag. Toggle
        // selection instead of committing a no-op position change.
        setSelectedElementId((prev) =>
          prev === dragState.elementId ? null : dragState.elementId
        )
      } else if (onDragEnd) {
        onDragEnd(dragState.elementId, dragState.current, dragState.panelName, dragState.secondaryPanelName)
      }
    }
    setDragState(null)
  }

  const endResize = () => {
    if (resizeState && onResize) {
      onResize(
        resizeState.elementId,
        resizeState.current.position,
        resizeState.current.size,
        resizeState.panelName,
        resizeState.secondaryPanelName
      )
    }
    setResizeState(null)
  }

  const handlePointerUp = () => {
    endResize()
    endDrag()
  }

  // Cheap, soft, informational reuse of the already-built constraint engine
  // rule - never blocks the interaction, just outlines the elements it
  // flags. Substitutes whichever element is currently being dragged OR
  // resized with its live (position, size) before checking.
  const overlappingElementIds = new Set<string>()
  const liveOverride = dragState
    ? {
        elementId: dragState.elementId,
        panelName: dragState.panelName,
        secondaryPanelName: dragState.secondaryPanelName,
        position: dragState.current,
        size: dragState.size,
      }
    : resizeState
    ? {
        elementId: resizeState.elementId,
        panelName: resizeState.panelName,
        secondaryPanelName: resizeState.secondaryPanelName,
        position: resizeState.current.position,
        size: resizeState.current.size,
      }
    : null
  if (liveOverride && resolvedLayout) {
    // A wrap element's live footprint occupies two panels' worth of space -
    // check it against whichever real elements sit on EITHER touched
    // panel, not just the one it started this gesture on, so the on-canvas
    // overlap warning doesn't silently miss a collision on the far side.
    const touchedPanelNames = liveOverride.secondaryPanelName
      ? [liveOverride.panelName, liveOverride.secondaryPanelName]
      : [liveOverride.panelName]

    for (const panelName of touchedPanelNames) {
      const panelElements = elementsTouchingPanel(resolvedLayout, panelName)
      const withLiveOverride = panelElements.map((el) =>
        el.elementId === liveOverride.elementId
          ? {
              ...el,
              position: liveOverride.position,
              size: liveOverride.size,
              panelName: liveOverride.panelName,
              secondaryPanelName: liveOverride.secondaryPanelName,
            }
          : el
      )
      const panelGeometry = panels.find((p) => p.panelName === panelName)
      if (panelGeometry) {
        for (const violation of noElementOverlapRule.check(
          withLiveOverride,
          resolvedLayout,
          panelGeometry
        )) {
          overlappingElementIds.add(violation.elementId)
        }
      }
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={className}
      data-testid="dieline-preview"
      // Dragging/resizing near the <text> elements would otherwise trigger
      // the browser's native text selection mid-gesture.
      style={dragState || resizeState ? { userSelect: "none" } : undefined}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <defs>
        {ELEMENT_LIBRARY.map((item) => (
          <symbol key={item.id} id={`library-element-${item.id}`} viewBox={item.viewBox}>
            {item.markup}
          </symbol>
        ))}
      </defs>
      <g transform={`matrix(1 0 0 -1 0 ${minY + maxY})`}>
        {panels.flatMap((panel) =>
          panel.printZones.map((zone) => (
            <polygon
              key={zone.id}
              points={toPolylinePoints(zone.boundary)}
              fill={backgroundColors?.[panel.panelName] ?? "rgba(0,0,0,0.04)"}
              stroke="none"
            />
          ))
        )}
        {panels.flatMap((panel) =>
          panel.creaseLines.map((line, i) => (
            <polyline
              key={`${panel.panelName}-crease-${i}`}
              points={toPolylinePoints(line)}
              fill="none"
              stroke="#9ca3af"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))
        )}
        {panels.flatMap((panel) =>
          panel.cutLines.map((line, i) => (
            <polyline
              key={`${panel.panelName}-cut-${i}`}
              points={toPolylinePoints(line)}
              fill="none"
              stroke="#000"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))
        )}
      </g>

      {/* Not inside the flipped <g> above - see the note on flipY. */}
      <g>
        {Array.from(elementsByPanel.entries()).map(([panelName, elements]) => (
          <g key={panelName}>
            {elements.map((el) => {
              const isDragging = dragState?.elementId === el.elementId
              const isResizing = resizeState?.elementId === el.elementId
              const position = isDragging
                ? dragState.current
                : isResizing
                ? resizeState.current.position
                : el.position
              const size = isResizing ? resizeState.current.size : el.size
              const x = position.x
              const y = flipY(position.y + size.h)
              const isOverlapping = overlappingElementIds.has(el.elementId)
              const isSelected = selectedElementId === el.elementId

              let visual: React.ReactNode = null

              if (isImageLike(el)) {
                const url = el.content.url
                if (typeof url === "string") {
                  visual = (
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
              } else if (el.elementType === "text") {
                const text = el.content.text
                const font = el.content.font
                const fontWeight = el.content.fontWeight
                const uppercase = el.content.uppercase === true
                if (typeof text === "string") {
                  const fontSize = textFontSize(size, font, fontWeight, uppercase)
                  visual = (
                    <text
                      x={position.x + size.w / 2}
                      y={flipY(position.y + size.h / 2)}
                      fontSize={fontSize}
                      fontFamily={typeof font === "string" ? font : undefined}
                      fontWeight={typeof fontWeight === "number" ? fontWeight : undefined}
                      style={uppercase ? { textTransform: "uppercase" } : undefined}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#000"
                    >
                      {text}
                    </text>
                  )
                }
              } else if (
                el.elementType === "icon" ||
                el.elementType === "shape" ||
                el.elementType === "pattern"
              ) {
                const libraryElementId = el.content.libraryElementId
                const entry =
                  typeof libraryElementId === "string"
                    ? getLibraryElement(libraryElementId)
                    : undefined
                if (entry) {
                  const color =
                    typeof el.content.color === "string" ? el.content.color : undefined
                  visual = (
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
              }
              // qr/barcode rendering lands with their own element-type
              // plugins later - nothing to draw yet, `visual` stays null.

              if (!visual) return null

              const isEditingThisElement = editingElementId === el.elementId

              if (isEditingThisElement) {
                const font = el.content.font
                const fontWeight = el.content.fontWeight
                const uppercase = el.content.uppercase === true
                const fontSize = textFontSize(size, font, fontWeight, uppercase)
                return (
                  <g key={el.elementId}>
                    <foreignObject x={x} y={y} width={size.w} height={size.h}>
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={commitTextEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            commitTextEdit()
                          } else if (e.key === "Escape") {
                            e.preventDefault()
                            cancelTextEdit()
                          }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                          width: "100%",
                          height: "100%",
                          boxSizing: "border-box",
                          padding: 0,
                          border: "1px dashed #2563eb",
                          outline: "none",
                          background: "rgba(255,255,255,0.9)",
                          textAlign: "center",
                          color: "#000",
                          fontFamily: typeof font === "string" ? font : undefined,
                          fontWeight: typeof fontWeight === "number" ? fontWeight : undefined,
                          textTransform: uppercase ? "uppercase" : "none",
                          fontSize,
                        }}
                      />
                    </foreignObject>
                  </g>
                )
              }

              return (
                <g key={el.elementId}>
                  {visual}
                  {isOverlapping && (
                    <rect
                      x={x}
                      y={y}
                      width={size.w}
                      height={size.h}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    />
                  )}
                  {onDragEnd && (
                    <rect
                      x={x}
                      y={y}
                      width={size.w}
                      height={size.h}
                      fill="transparent"
                      pointerEvents="all"
                      style={{ touchAction: "none", cursor: "grab" }}
                      onPointerDown={handlePointerDown(el)}
                      onDoubleClick={
                        el.elementType === "text" && onEditText
                          ? () => startEditingText(el)
                          : undefined
                      }
                    />
                  )}
                  {isSelected && (
                    <>
                      <rect
                        x={x}
                        y={y}
                        width={size.w}
                        height={size.h}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                      {onResize &&
                        (
                          [
                            ["tl", x, y],
                            ["tr", x + size.w, y],
                            ["bl", x, y + size.h],
                            ["br", x + size.w, y + size.h],
                          ] as const
                        ).map(([handle, cx, cy]) => (
                          <g key={handle}>
                            {/* Larger invisible circle so the dot stays
                                easy to grab (mouse or touch) even though
                                the visible marker itself is small. */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={handleRadius * 2.5}
                              fill="transparent"
                              pointerEvents="all"
                              style={{
                                cursor:
                                  handle === "tl" || handle === "br"
                                    ? "nwse-resize"
                                    : "nesw-resize",
                                touchAction: "none",
                              }}
                              onPointerDown={handleCornerPointerDown(el, handle)}
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={handleRadius}
                              fill="#2563eb"
                              pointerEvents="none"
                            />
                          </g>
                        ))}
                      {onDeleteElement && (
                        <g
                          style={{ cursor: "pointer" }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            // Falls back to elementId when there's no
                            // sourceElementId (e.g. AI-composed elements
                            // don't set one) - deletes just this one
                            // placement in that case, which is the only
                            // sensible fallback without a logical
                            // selection to trace back to.
                            onDeleteElement(el.sourceElementId ?? el.elementId)
                            setSelectedElementId(null)
                          }}
                        >
                          {/* Above the top edge, centered - clear of the
                              tl/tr resize handles which sit right on it. */}
                          <circle
                            cx={x + size.w / 2}
                            cy={y - handleRadius * 2.6}
                            r={handleRadius * 1.5}
                            fill="#ef4444"
                          />
                          <text
                            x={x + size.w / 2}
                            y={y - handleRadius * 2.6}
                            fontSize={handleRadius * 1.8}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#fff"
                            style={{ userSelect: "none" }}
                          >
                            ×
                          </text>
                        </g>
                      )}
                    </>
                  )}
                </g>
              )
            })}
          </g>
        ))}
      </g>
    </svg>
  )
}

export default DielinePreview
