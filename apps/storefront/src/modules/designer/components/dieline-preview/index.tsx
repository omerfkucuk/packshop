"use client"

import { useRef, useState } from "react"
import type { PanelGeometry, Point } from "@dtc/packaging-engine/shared"
import { zoneOrigin } from "@dtc/packaging-engine/placement"
import type { ResolvedLayout, ResolvedElement } from "@dtc/layout-engine"
import { noElementOverlapRule } from "@dtc/layout-engine/constraints"
import { ELEMENT_LIBRARY, getLibraryElement } from "../../utils/element-library"

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
   *  main panel sits side by side in this same flat mm space. Omit to
   *  render a non-interactive preview. */
  onDragEnd?: (elementId: string, position: Point, panelName: string) => void
  /** Fires once, on release, after dragging a corner handle - the
   *  recentered position and new (aspect-ratio-preserved, zone-clamped)
   *  size. Selecting an element (which shows the handles) piggybacks on
   *  the same pointer interaction as drag, so pass both together. */
  onResize?: (elementId: string, position: Point, size: { w: number; h: number }) => void
}

type DragState = {
  elementId: string
  panelName: string
  size: { w: number; h: number }
  pointerStart: Point // root <svg> user space (mm-numeric, Y-down)
  elementStart: Point // mm space, Y-up - same convention as ResolvedElement.position
  current: Point // mm space, Y-up - the live, clamped drag position
}

type CornerHandle = "tl" | "tr" | "bl" | "br"

type ResizeState = {
  elementId: string
  panelName: string
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

const MIN_TEXT_SIZE = 10
const MAX_TEXT_SIZE = 40

const isImageLike = (el: ResolvedElement) =>
  el.elementType === "logo" ||
  el.elementType === "image" ||
  el.elementType === "reference-image" ||
  el.elementType === "ai-generated"

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
}: DielinePreviewProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  // Not cleared when the element disappears from a new resolvedLayout (a
  // stale id here is harmless - the render loop below only shows resize
  // handles for elements it's actually iterating over).
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)

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
        panelName: el.panelName,
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
        panelName: el.panelName,
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
      const zone = zoneFor(resizeState.panelName)
      const minScale = Math.max(
        MIN_ELEMENT_SIZE_MM / resizeState.originalSize.w,
        MIN_ELEMENT_SIZE_MM / resizeState.originalSize.h
      )
      let maxScale = Infinity
      if (zone) {
        const origin = zoneOrigin(zone)
        const zoneMinX = origin.x
        const zoneMaxX = origin.x + zone.boundingBox.w
        const zoneMinY = origin.y
        const zoneMaxY = origin.y + zone.boundingBox.h
        // The anchor is fixed; only the FAR corner (the one being dragged)
        // needs to stay inside the zone as the box grows away from it.
        const maxScaleX =
          dx === 1
            ? (zoneMaxX - resizeState.anchor.x) / resizeState.originalSize.w
            : (resizeState.anchor.x - zoneMinX) / resizeState.originalSize.w
        const maxScaleY =
          dy === 1
            ? (zoneMaxY - resizeState.anchor.y) / resizeState.originalSize.h
            : (resizeState.anchor.y - zoneMinY) / resizeState.originalSize.h
        maxScale = Math.min(maxScaleX, maxScaleY)
      }
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
        prev ? { ...prev, current: { position: newPosition, size: newSize } } : prev
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
    const zone = targetPanel?.printZones[0]
    const clamped = zone
      ? {
          x: clamp(
            rawX,
            zoneOrigin(zone).x,
            zoneOrigin(zone).x + zone.boundingBox.w - dragState.size.w
          ),
          y: clamp(
            rawY,
            zoneOrigin(zone).y,
            zoneOrigin(zone).y + zone.boundingBox.h - dragState.size.h
          ),
        }
      : { x: rawX, y: rawY }

    setDragState((prev) =>
      prev
        ? { ...prev, current: clamped, panelName: targetPanel?.panelName ?? prev.panelName }
        : prev
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
        onDragEnd(dragState.elementId, dragState.current, dragState.panelName)
      }
    }
    setDragState(null)
  }

  const endResize = () => {
    if (resizeState && onResize) {
      onResize(resizeState.elementId, resizeState.current.position, resizeState.current.size)
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
        position: dragState.current,
        size: dragState.size,
      }
    : resizeState
    ? {
        elementId: resizeState.elementId,
        panelName: resizeState.panelName,
        position: resizeState.current.position,
        size: resizeState.current.size,
      }
    : null
  if (liveOverride) {
    const panelElements = elementsByPanel.get(liveOverride.panelName) ?? []
    const withLiveOverride = panelElements.map((el) =>
      el.elementId === liveOverride.elementId
        ? { ...el, position: liveOverride.position, size: liveOverride.size }
        : el
    )
    const panelGeometry = panels.find((p) => p.panelName === liveOverride.panelName)
    if (panelGeometry && resolvedLayout) {
      for (const violation of noElementOverlapRule.check(
        withLiveOverride,
        resolvedLayout,
        panelGeometry
      )) {
        overlappingElementIds.add(violation.elementId)
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
              const isSelected = onResize && selectedElementId === el.elementId

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
                if (typeof text === "string") {
                  const fontSize = Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, size.h))
                  visual = (
                    <text
                      x={position.x + size.w / 2}
                      y={flipY(position.y + size.h / 2)}
                      fontSize={fontSize}
                      fontFamily={typeof font === "string" ? font : undefined}
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
                      {(
                        [
                          ["tl", x, y],
                          ["tr", x + size.w, y],
                          ["bl", x, y + size.h],
                          ["br", x + size.w, y + size.h],
                        ] as const
                      ).map(([handle, cx, cy]) => (
                        <g key={handle}>
                          {/* Larger invisible circle so the dot stays easy
                              to grab (mouse or touch) even though the
                              visible marker itself is small. */}
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
