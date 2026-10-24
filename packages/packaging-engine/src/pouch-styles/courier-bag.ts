import { PanelGeometry, Point, PrintZone } from "../shared/types"
import { PouchParams } from "./types"

// A flat (non-gusseted) courier bag / kargo poşeti with a self-seal flap:
// a front face (width x height), a back face of the same size, and the
// flap hinged off the back's top edge (width x flapHeight). Product sizes
// read "24x30+5" = width 24cm, height 30cm, flap 5cm, so the printable
// back side is width x (height + flap).
//
// Front and back sit side by side with a gap rather than joined at the
// bottom fold - this is the layout print templates use, and it keeps both
// faces upright on screen. The flap stays attached to the back across a
// real crease, so a design can wrap from the back onto the flap (see
// deriveWrapZones).
const FACE_GAP_MM = 40

// Side seams are heat-welded, so keep artwork a little further from the
// left/right edges than from the bottom fold or the flap crease.
const SIDE_SEAL_MARGIN_MM = 8
const PRINT_SAFE_MARGIN_MM = 5

export const COURIER_BAG_PANEL_NAMES = {
  front: "Bag-Front",
  back: "Bag-Back",
  flap: "Bag-Flap",
} as const

const line = (from: Point, to: Point): Point[] => [from, to]

const rectZone = (
  panelName: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  insets: { top: number; bottom: number; left: number; right: number }
): PrintZone => {
  const minX = x0 + insets.left
  const maxX = x1 - insets.right
  const minY = y0 + insets.bottom
  const maxY = y1 - insets.top
  return {
    id: `${panelName}-print`,
    panelName,
    boundary: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    boundingBox: { w: maxX - minX, h: maxY - minY },
    safeInsets: insets,
  }
}

export function generateCourierBag(params: PouchParams): PanelGeometry[] {
  const { width, height, flapHeight } = params

  if (width <= 0 || height <= 0) {
    throw new Error("Courier bag: width and height must be positive")
  }
  if (flapHeight <= 0 || flapHeight >= height) {
    throw new Error("Courier bag: flap height must be positive and shorter than the bag")
  }

  const sideInsets = { left: SIDE_SEAL_MARGIN_MM, right: SIDE_SEAL_MARGIN_MM }

  // Front: once sealed, the flap folds down over its top `flapHeight`, so
  // the print zone stops below that strip - artwork there would be hidden.
  const front: PanelGeometry = {
    panelName: COURIER_BAG_PANEL_NAMES.front,
    cutLines: [
      line({ x: 0, y: 0 }, { x: 0, y: height }),
      line({ x: 0, y: height }, { x: width, y: height }),
      line({ x: width, y: height }, { x: width, y: 0 }),
      line({ x: width, y: 0 }, { x: 0, y: 0 }),
    ],
    creaseLines: [],
    printZones: [
      rectZone(COURIER_BAG_PANEL_NAMES.front, 0, 0, width, height, {
        ...sideInsets,
        bottom: PRINT_SAFE_MARGIN_MM,
        top: flapHeight + PRINT_SAFE_MARGIN_MM,
      }),
    ],
  }

  const bx0 = width + FACE_GAP_MM
  const bx1 = bx0 + width
  const flapTopY = height + flapHeight

  const back: PanelGeometry = {
    panelName: COURIER_BAG_PANEL_NAMES.back,
    cutLines: [
      line({ x: bx0, y: height }, { x: bx0, y: 0 }),
      line({ x: bx0, y: 0 }, { x: bx1, y: 0 }),
      line({ x: bx1, y: 0 }, { x: bx1, y: height }),
    ],
    // The flap's fold line.
    creaseLines: [line({ x: bx0, y: height }, { x: bx1, y: height })],
    printZones: [
      rectZone(COURIER_BAG_PANEL_NAMES.back, bx0, 0, bx1, height, {
        ...sideInsets,
        bottom: PRINT_SAFE_MARGIN_MM,
        top: PRINT_SAFE_MARGIN_MM,
      }),
    ],
  }

  // Printed on its outer side, which is the back's own outer surface
  // continued - so it reads upright from behind while the bag is open, and
  // upside down from the front once folded shut.
  const flap: PanelGeometry = {
    panelName: COURIER_BAG_PANEL_NAMES.flap,
    cutLines: [
      line({ x: bx0, y: height }, { x: bx0, y: flapTopY }),
      line({ x: bx0, y: flapTopY }, { x: bx1, y: flapTopY }),
      line({ x: bx1, y: flapTopY }, { x: bx1, y: height }),
    ],
    creaseLines: [],
    printZones: [
      rectZone(COURIER_BAG_PANEL_NAMES.flap, bx0, height, bx1, flapTopY, {
        ...sideInsets,
        bottom: PRINT_SAFE_MARGIN_MM,
        top: PRINT_SAFE_MARGIN_MM,
      }),
    ],
  }

  return [front, back, flap]
}
