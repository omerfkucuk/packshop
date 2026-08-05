import { PrintZone } from "../shared/types"
import { DesignElement, PositionedDesign } from "./types"
import { fitCenter, PlacementStrategy } from "./strategies"

// Fits a set of design elements into a print zone. This has no idea which
// product family the zone came from - it only ever reads `PrintZone`'s own
// fields (boundary/boundingBox), so it works the same for a box panel or a
// pouch panel. Every element type (logo, text, pattern, reference-image,
// ai-generated) goes through the same strategy-based sizing; what differs
// per type is `content`, which this function never inspects.
export function placeDesign(
  zone: PrintZone,
  elements: DesignElement[],
  strategy: PlacementStrategy = fitCenter
): PositionedDesign[] {
  return elements.map((element) => {
    const { position, size } = strategy(zone, element.naturalSize)

    return {
      elementId: element.id,
      panelName: zone.panelName,
      zoneId: zone.id,
      position,
      size,
    }
  })
}
