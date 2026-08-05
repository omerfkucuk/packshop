import { DxfWriter, point3d, Colors, LineTypes } from "@tarikjabiri/dxf"
import { PanelGeometry, Point } from "../shared/types"

const CUT_LAYER = "Taglio"
const CREASE_LAYER = "Cordone"

const addPolyline = (
  dxf: DxfWriter,
  points: Point[],
  layerName: string
): void => {
  for (let i = 0; i < points.length - 1; i++) {
    dxf.addLine(
      point3d(points[i].x, points[i].y),
      point3d(points[i + 1].x, points[i + 1].y),
      { layerName }
    )
  }
}

// Renders a set of panels to a flat DXF string: cut lines on the "Taglio"
// layer, crease lines on "Cordone", matching how these are conventionally
// separated in packaging manufacturing files. Print zones aren't exported -
// they're a storefront/design concept, not a cut/crease instruction.
export function exportToDxf(panels: PanelGeometry[]): string {
  const dxf = new DxfWriter()

  dxf.addLayer(CUT_LAYER, Colors.Red, LineTypes.Continuous)
  dxf.addLayer(CREASE_LAYER, Colors.Blue, LineTypes.Continuous)

  for (const panel of panels) {
    for (const cutLine of panel.cutLines) {
      addPolyline(dxf, cutLine, CUT_LAYER)
    }
    for (const creaseLine of panel.creaseLines) {
      addPolyline(dxf, creaseLine, CREASE_LAYER)
    }
  }

  return dxf.stringify()
}
