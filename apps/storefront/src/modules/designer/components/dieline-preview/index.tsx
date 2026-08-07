import type { PanelGeometry, Point } from "@dtc/packaging-engine/shared"
import type { ResolvedLayout, ResolvedElement } from "@dtc/layout-engine"

type DielinePreviewProps = {
  panels: PanelGeometry[]
  resolvedLayout?: ResolvedLayout | null
  backgroundColors?: Record<string, string>
  className?: string
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

// Flat 2D render of a generated dieline: cut lines solid black, crease lines
// dashed gray, print zones lightly shaded (or the resolved layout's chosen
// background color). Coordinates come from @dtc/packaging-engine/
// @dtc/layout-engine in a Y-up mm space; SVG is Y-down, so the geometry
// (pure lines/polygons, safe to flip as-is) renders inside a
// vertically-flipped <g>. Painted content - images and text - would render
// upside down under that same flip, so their positions are pre-flipped by
// hand instead and drawn in a normal, unflipped <g> on top.
const DielinePreview = ({
  panels,
  resolvedLayout,
  backgroundColors,
  className,
}: DielinePreviewProps) => {
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

  return (
    <svg viewBox={viewBox} className={className} data-testid="dieline-preview">
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
              if (isImageLike(el)) {
                const url = el.content.url
                if (typeof url !== "string") return null
                return (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <image
                    key={el.elementId}
                    href={url}
                    x={el.position.x}
                    y={flipY(el.position.y + el.size.h)}
                    width={el.size.w}
                    height={el.size.h}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )
              }

              if (el.elementType === "text") {
                const text = el.content.text
                const font = el.content.font
                if (typeof text !== "string") return null
                const fontSize = Math.min(
                  MAX_TEXT_SIZE,
                  Math.max(MIN_TEXT_SIZE, el.size.h)
                )
                return (
                  <text
                    key={el.elementId}
                    x={el.position.x + el.size.w / 2}
                    y={flipY(el.position.y + el.size.h / 2)}
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

              // qr/barcode/icon/shape rendering lands with their own
              // element-type plugins later - nothing to draw yet.
              return null
            })}
          </g>
        ))}
      </g>
    </svg>
  )
}

export default DielinePreview
