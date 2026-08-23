// All coordinates and lengths are in millimeters, in a flat/unrolled dieline
// coordinate space (X increases to the right, Y increases upward) unless a
// type's own docs say otherwise.

export interface Point {
  x: number
  y: number
}

// A generic 2D size - reused for anything that needs a plain width/height
// pair (e.g. a print zone's bounding box) without pulling in a specific
// product's parameter type.
export interface Dimensions {
  w: number
  h: number
}

// The physical board/film a panel is made from. Board thickness in
// particular feeds into flap and glue-tab sizing (see box-styles).
export interface Material {
  id: string
  name: string
  thicknessMm: number
}

// The subset of a print zone's shape that placement math actually needs -
// a bounded polygon plus its axis-aligned box, optionally with per-edge
// safety insets. Extracted so callers that build a zone-shaped area without
// a single real physical panel behind it (e.g. a WrapZone spanning two
// panels, see placement/wrap-zone.ts) can reuse the same placement/bounds
// helpers as a real PrintZone, without faking an `id`/`panelName`.
export interface ZoneLike {
  boundary: Point[]
  boundingBox: Dimensions
  safeInsets?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

// A single allowed print area on a panel. `boundary` is the actual usable
// polygon (already inset from the panel's crease lines by any safety
// margin); `boundingBox` is a convenience axis-aligned size derived from it.
export interface PrintZone extends ZoneLike {
  id: string
  panelName: string
}

// One physical piece of the dieline (e.g. one side panel plus the flaps
// hinged off it, or the glue tab). `cutLines`/`creaseLines` are lists of
// polylines - a straight edge is just a 2-point polyline, but multi-segment
// cuts (e.g. a tapered flap corner) are a single entry with more points.
export interface PanelGeometry {
  panelName: string
  cutLines: Point[][]
  creaseLines: Point[][]
  printZones: PrintZone[]
}
