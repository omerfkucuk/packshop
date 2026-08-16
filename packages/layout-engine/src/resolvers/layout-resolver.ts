import type { PanelGeometry, Dimensions } from "@dtc/packaging-engine/shared"
import { placeDesign, anchorFit } from "@dtc/packaging-engine/placement"

import type {
  CompositionPlan,
  SemanticPlacement,
} from "../domain/semantic-placement"
import type { PanelSemanticsMap, SizeBucketOverrides } from "../domain/panel-semantics"
import type { ResolvedElement, ResolvedLayout } from "../domain/resolved-layout"
import { resolveSize } from "./size-resolver"
import { resolveRelativePosition, ResolvedBox } from "./relative-resolver"
import { topologicalSort, MissingReferenceError } from "./dependency-graph"

export class UnknownPanelError extends Error {
  constructor(
    public readonly elementId: string,
    public readonly panel: string
  ) {
    super(
      `Element "${elementId}" references panel "${panel}", which this box type has no mapping for`
    )
    this.name = "UnknownPanelError"
  }
}

export class UnresolvedZoneError extends Error {
  constructor(
    public readonly elementId: string,
    public readonly physicalPanelName: string
  ) {
    super(
      `Physical panel "${physicalPanelName}" (for element "${elementId}") has no print zone - it's likely a flap or glue tab, not a printable face`
    )
    this.name = "UnresolvedZoneError"
  }
}

// Default paint order when nothing overrides it: backgrounds lowest,
// scannable codes always on top so nothing can visually clip them.
const DEFAULT_Z_INDEX: Record<string, number> = {
  shape: 0,
  pattern: 5,
  image: 10,
  "reference-image": 10,
  "ai-generated": 15,
  icon: 20,
  logo: 30,
  text: 40,
  barcode: 90,
  qr: 100,
}

export interface ResolveLayoutOptions {
  panelSemantics: PanelSemanticsMap
  sizeBucketOverrides?: SizeBucketOverrides
  /** Look up a real, known size for an element's content (e.g. an uploaded
   *  logo's actual pixel dimensions) - when present, this wins over the
   *  plan's SizeHint entirely. */
  computeNaturalSize?: (element: SemanticPlacement) => Dimensions | null
}

// Resolves a CompositionPlan (AI's semantic decisions) against a specific
// box's real geometry into a ResolvedLayout with concrete mm coordinates.
// Pure and synchronous - no AI, no I/O - so it's cheap enough to run for
// instant live preview as much as for validating an AI's output.
export function resolveLayout(
  plan: CompositionPlan,
  geometry: PanelGeometry[],
  options: ResolveLayoutOptions
): ResolvedLayout {
  const geometryByPanel = new Map(geometry.map((p) => [p.panelName, p]))
  const sortedElements = topologicalSort(plan.elements)
  const resolvedById = new Map<string, ResolvedElement & ResolvedBox>()
  const elementsByPanel = new Map<string, ResolvedElement[]>()

  for (const el of sortedElements) {
    const physicalPanelName = options.panelSemantics[el.panel]
    if (!physicalPanelName) {
      throw new UnknownPanelError(el.elementId, el.panel)
    }

    const panelGeometry = geometryByPanel.get(physicalPanelName)
    const zone = panelGeometry?.printZones[0]
    if (!panelGeometry || !zone) {
      throw new UnresolvedZoneError(el.elementId, physicalPanelName)
    }

    const naturalSize = options.computeNaturalSize?.(el) ?? null
    let position: ResolvedBox["position"]
    let size: Dimensions

    if (el.placementKind === "absolute") {
      size = resolveSize(el.size, zone.boundingBox, options.sizeBucketOverrides, naturalSize)
      const [placed] = placeDesign(
        zone,
        [{ id: el.elementId, type: el.elementType, naturalSize: size }],
        anchorFit(el.anchor)
      )
      position = placed.position
    } else {
      const reference = resolvedById.get(el.relativeTo)
      if (!reference) {
        // topologicalSort already guarantees the reference resolves before
        // this element - this only guards against a resolver bug.
        throw new MissingReferenceError(el.elementId, el.relativeTo)
      }
      size = resolveSize(el.size, zone.boundingBox, options.sizeBucketOverrides, naturalSize)
      position = resolveRelativePosition(el.position, reference, size, el.gapHint)
    }

    const resolvedElement: ResolvedElement & ResolvedBox = {
      elementId: el.elementId,
      elementType: el.elementType,
      panelName: physicalPanelName,
      position,
      size,
      zIndex: DEFAULT_Z_INDEX[el.elementType] ?? 50,
      content: el.content,
      sourceElementId: el.sourceElementId,
    }

    resolvedById.set(el.elementId, resolvedElement)

    const panelElements = elementsByPanel.get(physicalPanelName) ?? []
    panelElements.push(resolvedElement)
    elementsByPanel.set(physicalPanelName, panelElements)
  }

  return {
    boxType: plan.boxType,
    compositionPlanVersion: plan.version,
    panels: [...elementsByPanel.entries()].map(([panelName, elements]) => ({
      panelName,
      elements,
    })),
  }
}
