import { PanelGeometry, Point, PrintZone } from "../shared/types"
import { PouchParams } from "./types"

// A flat (non-gusseted) courier bag / kargo poşeti with a self-seal flap,
// made from one piece of film: the front face (width x height) and the
// back face join along a vertical side fold, and the flap is hinged off the
// back's top edge (width x flapHeight). Product sizes read "24x30+5" =
// width 24cm, height 30cm, flap 5cm, so the printable back side is
// width x (height + flap).
//
// Laid out flat, front on the left and back on the right, both upright -
// the bag opens out from its right-hand side fold. Both the side fold and
// the flap crease are real hinges in the film, so a design can wrap across
// either (see deriveWrapZones).

// The other side and the bottom are heat-welded seams, so keep artwork a
// little further from those than from a fold or the flap crease.
const SEAL_MARGIN_MM = 8
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

  const foldX = width
  const backX1 = width * 2
  const flapTopY = height + flapHeight

  // Front: once sealed, the flap folds down over its top `flapHeight`, so
  // the print zone stops below that strip - artwork there would be hidden.
  const front: PanelGeometry = {
    panelName: COURIER_BAG_PANEL_NAMES.front,
    cutLines: [
      line({ x: foldX, y: 0 }, { x: 0, y: 0 }),
      line({ x: 0, y: 0 }, { x: 0, y: height }),
      line({ x: 0, y: height }, { x: foldX, y: height }),
    ],
    // The side fold to the back.
    creaseLines: [line({ x: foldX, y: 0 }, { x: foldX, y: height })],
    printZones: [
      rectZone(COURIER_BAG_PANEL_NAMES.front, 0, 0, foldX, height, {
        left: SEAL_MARGIN_MM,
        right: PRINT_SAFE_MARGIN_MM,
        bottom: SEAL_MARGIN_MM,
        top: flapHeight + PRINT_SAFE_MARGIN_MM,
      }),
    ],
  }

  const back: PanelGeometry = {
    panelName: COURIER_BAG_PANEL_NAMES.back,
    cutLines: [
      line({ x: foldX, y: 0 }, { x: backX1, y: 0 }),
      line({ x: backX1, y: 0 }, { x: backX1, y: height }),
    ],
    // The flap's fold line.
    creaseLines: [line({ x: foldX, y: height }, { x: backX1, y: height })],
    printZones: [
      rectZone(COURIER_BAG_PANEL_NAMES.back, foldX, 0, backX1, height, {
        left: PRINT_SAFE_MARGIN_MM,
        right: SEAL_MARGIN_MM,
        bottom: SEAL_MARGIN_MM,
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
      line({ x: foldX, y: height }, { x: foldX, y: flapTopY }),
      line({ x: foldX, y: flapTopY }, { x: backX1, y: flapTopY }),
      line({ x: backX1, y: flapTopY }, { x: backX1, y: height }),
    ],
    creaseLines: [],
    printZones: [
      rectZone(COURIER_BAG_PANEL_NAMES.flap, foldX, height, backX1, flapTopY, {
        left: SEAL_MARGIN_MM,
        right: SEAL_MARGIN_MM,
        bottom: PRINT_SAFE_MARGIN_MM,
        top: PRINT_SAFE_MARGIN_MM,
      }),
    ],
  }

  return [front, back, flap]
}
