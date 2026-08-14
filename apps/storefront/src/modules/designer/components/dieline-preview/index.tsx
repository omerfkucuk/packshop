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
  /** Fires once, on release, with the element's final mm position - not on
   *  every pointermove (the live drag preview is local component state, so
   *  it doesn't need to round-trip through the parent's render on every
   *  frame). Omit to render a non-interactive preview. */
  onDragEnd?: (elementId: string, position: Point) => void
}

type DragState = {
  elementId: string
  panelName: string
  size: { w: number; h: number }
  pointerStart: Point // root <svg> user space (mm-numeric, Y-down)
  elementStart: Point // mm space, Y-up - same convention as ResolvedElement.position
  current: Point // mm space, Y-up - the live, clamped drag position
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
}: DielinePreviewProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

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

  const elementsByPanel = new Map(
    (resolvedLayout?.panels ?? []).map((p) => [
      p.panelName,
      [...p.elements].sort((a, b) => a.zIndex - b.zIndex),
    ])
  )

  const zoneFor = (panelName: string) =>
    panels.find((p) => p.panelName === panelName)?.printZones[0]

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

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) return
    const current = toSvgPoint(e.clientX, e.clientY)
    const dxSvg = current.x - dragState.pointerStart.x
    const dySvg = current.y - dragState.pointerStart.y
    // x maps 1:1 svg->mm; y inverts (svgY = flipY(mmY) is an involution) -
    // an on-screen downward drag must SUBTRACT from mm y (Y-up), not add.
    const rawX = dragState.elementStart.x + dxSvg
    const rawY = dragState.elementStart.y - dySvg

    const zone = zoneFor(dragState.panelName)
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

    setDragState((prev) => (prev ? { ...prev, current: clamped } : prev))
  }

  const endDrag = () => {
    if (dragState && onDragEnd) {
      onDragEnd(dragState.elementId, dragState.current)
    }
    setDragState(null)
  }

  // Cheap, soft, informational reuse of the already-built constraint engine
  // rule - never blocks the drag, just outlines the elements it flags.
  const overlappingElementIds = new Set<string>()
  if (dragState) {
    const panelElements = elementsByPanel.get(dragState.panelName) ?? []
    const withLiveDragPosition = panelElements.map((el) =>
      el.elementId === dragState.elementId ? { ...el, position: dragState.current } : el
    )
    const panelGeometry = panels.find((p) => p.panelName === dragState.panelName)
    if (panelGeometry && resolvedLayout) {
      for (const violation of noElementOverlapRule.check(
        withLiveDragPosition,
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
      // Dragging near the <text> elements would otherwise trigger the
      // browser's native text selection mid-drag.
      style={dragState ? { userSelect: "none" } : undefined}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
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
              const position = isDragging ? dragState.current : el.position
              const x = position.x
              const y = flipY(position.y + el.size.h)
              const isOverlapping = overlappingElementIds.has(el.elementId)

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
                      width={el.size.w}
                      height={el.size.h}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  )
                }
              } else if (el.elementType === "text") {
                const text = el.content.text
                const font = el.content.font
                if (typeof text === "string") {
                  const fontSize = Math.min(
                    MAX_TEXT_SIZE,
                    Math.max(MIN_TEXT_SIZE, el.size.h)
                  )
                  visual = (
                    <text
                      x={position.x + el.size.w / 2}
                      y={flipY(position.y + el.size.h / 2)}
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
                      width={el.size.w}
                      height={el.size.h}
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
                      width={el.size.w}
                      height={el.size.h}
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
                      width={el.size.w}
                      height={el.size.h}
                      fill="transparent"
                      pointerEvents="all"
                      style={{ touchAction: "none", cursor: "grab" }}
                      onPointerDown={handlePointerDown(el)}
                    />
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
