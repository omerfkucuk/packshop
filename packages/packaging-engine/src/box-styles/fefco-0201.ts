import { PanelGeometry, Point } from "../shared/types"
import { BoxParams } from "./types"

// A regular slotted container's flap depth is conventionally half the box
// width - when folded, the two flaps hinged off the long (length) panels
// meet edge-to-edge at the center, and the two flaps hinged off the short
// (width) panels tuck in just underneath them. Those inner flaps need to be
// a little shorter than the outer ones or they'd collide.
const INNER_FLAP_CLEARANCE_MM = 3
const PRINT_SAFE_MARGIN_MM = 5

// The manufacturing glue tab needs enough width to bond reliably; thicker
// board needs a bit more overlap. This is a simple approximation, not a
// board-specific engineering figure.
const GLUE_TAB_BASE_WIDTH_MM = 30
const GLUE_TAB_THICKNESS_FACTOR = 2

const line = (from: Point, to: Point): Point[] => [from, to]

const rectCutLines = (
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Point[][] => [
  line({ x: x0, y: y0 }, { x: x0, y: y1 }),
  line({ x: x0, y: y1 }, { x: x1, y: y1 }),
  line({ x: x1, y: y1 }, { x: x1, y: y0 }),
  line({ x: x1, y: y0 }, { x: x0, y: y0 }),
]

// The three outer (non-hinge) sides of a flap - the hinge side itself is
// the crease line back to the main panel, not a cut.
const flapCutLines = (
  x0: number,
  x1: number,
  hingeY: number,
  tipY: number
): Point[][] => [
  line({ x: x0, y: hingeY }, { x: x0, y: tipY }),
  line({ x: x0, y: tipY }, { x: x1, y: tipY }),
  line({ x: x1, y: tipY }, { x: x1, y: hingeY }),
]

export function generateFefco0201(params: BoxParams): PanelGeometry[] {
  const { length, width, height, thickness } = params

  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error("FEFCO 0201: length, width and height must be positive")
  }
  if (thickness < 0) {
    throw new Error("FEFCO 0201: thickness cannot be negative")
  }

  const outerFlapDepth = width / 2
  const innerFlapDepth = Math.max(0, outerFlapDepth - INNER_FLAP_CLEARANCE_MM)
  const glueTabWidth =
    GLUE_TAB_BASE_WIDTH_MM + thickness * GLUE_TAB_THICKNESS_FACTOR

  const mainBottomY = outerFlapDepth
  const mainTopY = outerFlapDepth + height

  // The four main panels, left to right: length, width, length, width.
  const panelDefs = [
    { name: "Panel-L1", width: length, isOuterFlap: true },
    { name: "Panel-W1", width, isOuterFlap: false },
    { name: "Panel-L2", width: length, isOuterFlap: true },
    { name: "Panel-W2", width, isOuterFlap: false },
  ]

  let cursorX = 0
  const panels: PanelGeometry[] = []

  panelDefs.forEach((def, index) => {
    const x0 = cursorX
    const x1 = cursorX + def.width
    cursorX = x1

    const flapDepth = def.isOuterFlap ? outerFlapDepth : innerFlapDepth
    const isFirst = index === 0

    const creaseLines: Point[][] = [
      // Fold lines into this panel's own top and bottom flaps.
      line({ x: x0, y: mainTopY }, { x: x1, y: mainTopY }),
      line({ x: x0, y: mainBottomY }, { x: x1, y: mainBottomY }),
      // Fold line to the next panel (or, for the last one, to the glue tab).
      line({ x: x1, y: mainBottomY }, { x: x1, y: mainTopY }),
    ]

    const cutLines: Point[][] = [
      ...flapCutLines(x0, x1, mainTopY, mainTopY + flapDepth),
      ...flapCutLines(x0, x1, mainBottomY, mainBottomY - flapDepth),
    ]

    if (isFirst) {
      // Nothing is hinged to the left of the first panel - that whole edge,
      // flaps included, is cut rather than creased.
      cutLines.push(
        line(
          { x: x0, y: mainBottomY - flapDepth },
          { x: x0, y: mainTopY + flapDepth }
        )
      )
    }

    panels.push({
      panelName: def.name,
      cutLines,
      creaseLines,
      printZones: [
        {
          id: `${def.name}-print`,
          panelName: def.name,
          boundary: [
            { x: x0 + PRINT_SAFE_MARGIN_MM, y: mainBottomY + PRINT_SAFE_MARGIN_MM },
            { x: x1 - PRINT_SAFE_MARGIN_MM, y: mainBottomY + PRINT_SAFE_MARGIN_MM },
            { x: x1 - PRINT_SAFE_MARGIN_MM, y: mainTopY - PRINT_SAFE_MARGIN_MM },
            { x: x0 + PRINT_SAFE_MARGIN_MM, y: mainTopY - PRINT_SAFE_MARGIN_MM },
          ],
          boundingBox: {
            w: def.width - PRINT_SAFE_MARGIN_MM * 2,
            h: height - PRINT_SAFE_MARGIN_MM * 2,
          },
          safeInsets: {
            top: PRINT_SAFE_MARGIN_MM,
            bottom: PRINT_SAFE_MARGIN_MM,
            left: PRINT_SAFE_MARGIN_MM,
            right: PRINT_SAFE_MARGIN_MM,
          },
        },
      ],
    })
  })

  // Glue tab, hinged off the last (Panel-W2) panel's right edge. It has no
  // flaps of its own, so its top and bottom edges are cuts, not creases, and
  // it carries no print zone - it ends up glued down out of sight.
  const glueTabX0 = cursorX
  const glueTabX1 = cursorX + glueTabWidth

  panels.push({
    panelName: "GlueTab",
    creaseLines: [
      line({ x: glueTabX0, y: mainBottomY }, { x: glueTabX0, y: mainTopY }),
    ],
    cutLines: [
      line({ x: glueTabX0, y: mainTopY }, { x: glueTabX1, y: mainTopY }),
      line({ x: glueTabX1, y: mainTopY }, { x: glueTabX1, y: mainBottomY }),
      line({ x: glueTabX1, y: mainBottomY }, { x: glueTabX0, y: mainBottomY }),
    ],
    printZones: [],
  })

  return panels
}
