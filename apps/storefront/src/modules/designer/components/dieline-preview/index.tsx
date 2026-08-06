import type { PanelGeometry, Point } from "@dtc/packaging-engine/shared"

type DielinePreviewProps = {
  panels: PanelGeometry[]
  className?: string
}

const toPolylinePoints = (points: Point[]) =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

// Flat 2D render of a generated dieline: cut lines solid black, crease lines
// dashed gray, print zones lightly shaded. Coordinates come from
// @dtc/packaging-engine in a Y-up mm space; SVG is Y-down, so everything is
// wrapped in a vertical flip so "top" flaps actually render at the top.
const DielinePreview = ({ panels, className }: DielinePreviewProps) => {
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

  const padding = Math.max(maxX - minX, maxY - minY) * 0.05
  const viewBox = `${minX - padding} ${minY - padding} ${
    maxX - minX + padding * 2
  } ${maxY - minY + padding * 2}`

  return (
    <svg
      viewBox={viewBox}
      className={className}
      data-testid="dieline-preview"
    >
      <g transform={`matrix(1 0 0 -1 0 ${minY + maxY})`}>
        {panels.flatMap((panel) =>
          panel.printZones.map((zone) => (
            <polygon
              key={zone.id}
              points={toPolylinePoints(zone.boundary)}
              fill="rgba(0,0,0,0.04)"
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
    </svg>
  )
}

export default DielinePreview
