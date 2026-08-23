import type { Dimensions, PanelGeometry, Point, PrintZone } from "../shared/types"

export type SeamAxis = "vertical" | "horizontal"

// A merged print area spanning two panels that share a real crease - lets a
// design element (e.g. a logo) be placed so it visually continues across
// the fold between them ("wrap-around print"), a standard technique in real
// corrugated packaging. Shaped like a ZoneLike (see shared/types.ts) so it
// can be sized/anchored/clamped with exactly the same placement helpers
// (zoneOrigin, fitCenter/anchorFit, the designer's own bounds math) as a
// normal single-panel PrintZone - no parallel math needed.
export interface WrapZone {
  id: string
  /** The two real PanelGeometry.panelName values this zone spans, ordered
   *  by increasing coordinate along seamAxis (left-then-right, or
   *  bottom-then-top). */
  panels: [string, string]
  seamAxis: SeamAxis
  /** The shared crease's own X (vertical seam) or Y (horizontal seam), mm. */
  seamCoordinate: number
  boundary: Point[]
  boundingBox: Dimensions
  safeInsets?: PrintZone["safeInsets"]
}

const EPSILON_MM = 0.01

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const boundsOf = (points: Point[]): Bounds => ({
  minX: Math.min(...points.map((p) => p.x)),
  minY: Math.min(...points.map((p) => p.y)),
  maxX: Math.max(...points.map((p) => p.x)),
  maxY: Math.max(...points.map((p) => p.y)),
})

const rectBoundary = (minX: number, minY: number, maxX: number, maxY: number): Point[] => [
  { x: minX, y: minY },
  { x: maxX, y: minY },
  { x: maxX, y: maxY },
  { x: minX, y: maxY },
]

// A straight crease segment on `panel`, constant on `axis` (a vertical line
// for axis "x", horizontal for axis "y"), whose constant coordinate falls
// inside [rangeMin, rangeMax] and whose extent on the OTHER axis covers at
// least [overlapMin, overlapMax]. Each main panel's print zone is already
// inset from its own physical edges (see PRINT_SAFE_MARGIN_MM in
// fefco-0201.ts) - two adjacent panels' zones therefore don't literally
// touch, they sit a few mm apart with the real crease running through that
// gap. Only a genuine hinge found there makes wrap-around printing
// physically meaningful, as opposed to two zones whose bounds merely
// happen to sit near each other. Returns the crease's own coordinate (used
// as the precise seam location) or null.
const findCreaseInRange = (
  panel: PanelGeometry,
  axis: "x" | "y",
  rangeMin: number,
  rangeMax: number,
  overlapMin: number,
  overlapMax: number
): number | null => {
  const other = axis === "x" ? "y" : "x"
  for (const line of panel.creaseLines) {
    if (line.length < 2) continue
    const coordinate = line[0][axis]
    const isConstantOnAxis = line.every((p) => Math.abs(p[axis] - coordinate) < EPSILON_MM)
    if (!isConstantOnAxis) continue
    if (coordinate < rangeMin - EPSILON_MM || coordinate > rangeMax + EPSILON_MM) continue

    const lineMin = Math.min(...line.map((p) => p[other]))
    const lineMax = Math.max(...line.map((p) => p[other]))
    if (lineMin <= overlapMin + EPSILON_MM && lineMax >= overlapMax - EPSILON_MM) {
      return coordinate
    }
  }
  return null
}

// Derives every valid wrap-eligible panel pair from a box style's generated
// geometry - generic over any PanelGeometry[], not hardcoded to FEFCO 0201.
// A pair is wrap-eligible when both panels carry a real print zone (this
// alone excludes flaps and the glue tab, which never get one) AND a real
// crease physically hinges them together across the gap between their
// zones. Two panels whose zones simply happen to be geometrically near each
// other without a shared crease (e.g. two faces on opposite sides of the
// box, connected only via the glue joint once assembled) are correctly
// excluded.
export function deriveWrapZones(geometry: PanelGeometry[]): WrapZone[] {
  const candidates = geometry.filter((panel) => panel.printZones.length > 0)
  const zones: WrapZone[] = []

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const panelA = candidates[i]
      const panelB = candidates[j]
      const zoneA = panelA.printZones[0]
      const zoneB = panelB.printZones[0]
      const boundsA = boundsOf(zoneA.boundary)
      const boundsB = boundsOf(zoneB.boundary)

      // Vertical seam candidate: one zone sits fully to the left of the
      // other (a gap on X), with an overlapping Y range - side-by-side
      // panels, exactly how FEFCO 0201's four main panels are laid out.
      if (boundsA.maxX <= boundsB.minX || boundsB.maxX <= boundsA.minX) {
        const [left, leftBounds, right, rightBounds] =
          boundsA.maxX <= boundsB.minX
            ? [panelA, boundsA, panelB, boundsB]
            : [panelB, boundsB, panelA, boundsA]

        // Reject a pair with a third print zone sitting in the gap between
        // them (e.g. front/left, with right/back's zones in between) -
        // only two zones with NOTHING else between them are truly
        // adjacent, regardless of what any individual crease line matches.
        const somethingBetween = candidates.some(
          (other) =>
            other !== left &&
            other !== right &&
            boundsOf(other.printZones[0].boundary).minX < rightBounds.minX - EPSILON_MM &&
            boundsOf(other.printZones[0].boundary).maxX > leftBounds.maxX + EPSILON_MM
        )

        const overlapMin = Math.max(leftBounds.minY, rightBounds.minY)
        const overlapMax = Math.min(leftBounds.maxY, rightBounds.maxY)

        if (!somethingBetween && overlapMax - overlapMin > EPSILON_MM) {
          const seamX =
            findCreaseInRange(left, "x", leftBounds.maxX, rightBounds.minX, overlapMin, overlapMax) ??
            findCreaseInRange(right, "x", leftBounds.maxX, rightBounds.minX, overlapMin, overlapMax)

          if (seamX !== null) {
            const leftZone = left.printZones[0]
            const rightZone = right.printZones[0]
            zones.push({
              id: `wrap:${left.panelName}:${right.panelName}`,
              panels: [left.panelName, right.panelName],
              seamAxis: "vertical",
              seamCoordinate: seamX,
              boundary: rectBoundary(leftBounds.minX, overlapMin, rightBounds.maxX, overlapMax),
              boundingBox: {
                w: rightBounds.maxX - leftBounds.minX,
                h: overlapMax - overlapMin,
              },
              safeInsets:
                leftZone.safeInsets && rightZone.safeInsets
                  ? {
                      left: leftZone.safeInsets.left,
                      right: rightZone.safeInsets.right,
                      top: Math.min(leftZone.safeInsets.top, rightZone.safeInsets.top),
                      bottom: Math.min(leftZone.safeInsets.bottom, rightZone.safeInsets.bottom),
                    }
                  : undefined,
            })
          }
        }
      }

      // Horizontal seam candidate: mirrors the vertical case for a box
      // style whose panels stack top/bottom instead of side by side. FEFCO
      // 0201's main panels share one Y band, so this never fires for it
      // today, but the derivation is axis-agnostic on purpose.
      if (boundsA.maxY <= boundsB.minY || boundsB.maxY <= boundsA.minY) {
        const [bottom, bottomBounds, top, topBounds] =
          boundsA.maxY <= boundsB.minY
            ? [panelA, boundsA, panelB, boundsB]
            : [panelB, boundsB, panelA, boundsA]

        const somethingBetween = candidates.some(
          (other) =>
            other !== bottom &&
            other !== top &&
            boundsOf(other.printZones[0].boundary).minY < topBounds.minY - EPSILON_MM &&
            boundsOf(other.printZones[0].boundary).maxY > bottomBounds.maxY + EPSILON_MM
        )

        const overlapMin = Math.max(bottomBounds.minX, topBounds.minX)
        const overlapMax = Math.min(bottomBounds.maxX, topBounds.maxX)

        if (!somethingBetween && overlapMax - overlapMin > EPSILON_MM) {
          const seamY =
            findCreaseInRange(bottom, "y", bottomBounds.maxY, topBounds.minY, overlapMin, overlapMax) ??
            findCreaseInRange(top, "y", bottomBounds.maxY, topBounds.minY, overlapMin, overlapMax)

          if (seamY !== null) {
            const bottomZone = bottom.printZones[0]
            const topZone = top.printZones[0]
            zones.push({
              id: `wrap:${bottom.panelName}:${top.panelName}`,
              panels: [bottom.panelName, top.panelName],
              seamAxis: "horizontal",
              seamCoordinate: seamY,
              boundary: rectBoundary(overlapMin, bottomBounds.minY, overlapMax, topBounds.maxY),
              boundingBox: {
                w: overlapMax - overlapMin,
                h: topBounds.maxY - bottomBounds.minY,
              },
              safeInsets:
                bottomZone.safeInsets && topZone.safeInsets
                  ? {
                      bottom: bottomZone.safeInsets.bottom,
                      top: topZone.safeInsets.top,
                      left: Math.min(bottomZone.safeInsets.left, topZone.safeInsets.left),
                      right: Math.min(bottomZone.safeInsets.right, topZone.safeInsets.right),
                    }
                  : undefined,
            })
          }
        }
      }
    }
  }

  return zones
}
