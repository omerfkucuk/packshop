import type { PanelGeometry, Point } from "@dtc/packaging-engine/shared"
import type { AppliedPanelDesign } from "../../utils/apply-design"

type DielinePreviewProps = {
  panels: PanelGeometry[]
  appliedDesign?: AppliedPanelDesign[]
  className?: string
}

const toPolylinePoints = (points: Point[]) =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

// Flat 2D render of a generated dieline: cut lines solid black, crease lines
// dashed gray, print zones lightly shaded (or the applied design's chosen
// color). Coordinates come from @dtc/packaging-engine in a Y-up mm space;
// SVG is Y-down, so the geometry (pure lines/polygons, safe to flip as-is)
// renders inside a vertically-flipped <g>. Painted content - the logo image
// and slogan text - would render upside down under that same flip, so their
// positions are pre-flipped by hand instead and drawn in a normal, unflipped
// <g> on top.
const DielinePreview = ({
  panels,
  appliedDesign,
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

  const designByPanel = new Map(
    (appliedDesign ?? []).map((d) => [d.panelName, d])
  )

  return (
    <svg viewBox={viewBox} className={className} data-testid="dieline-preview">
      <g transform={`matrix(1 0 0 -1 0 ${minY + maxY})`}>
        {panels.flatMap((panel) =>
          panel.printZones.map((zone) => (
            <polygon
              key={zone.id}
              points={toPolylinePoints(zone.boundary)}
              fill={
                designByPanel.get(panel.panelName)?.backgroundColor ??
                "rgba(0,0,0,0.04)"
              }
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
        {appliedDesign?.map((design) => (
          <g key={design.panelName}>
            {design.logo && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <image
                href={design.logo.url}
                x={design.logo.x}
                y={flipY(design.logo.y + design.logo.h)}
                width={design.logo.w}
                height={design.logo.h}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            {design.slogan && (
              <text
                x={design.slogan.x}
                y={flipY(design.slogan.y)}
                fontSize={design.slogan.fontSize}
                fontFamily={design.slogan.font ?? undefined}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#000"
              >
                {design.slogan.text}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  )
}

export default DielinePreview
