import type { RelativePlacement, SemanticPlacement } from "../domain/semantic-placement"

export class DependencyCycleError extends Error {
  constructor(public readonly cyclePath: string[]) {
    super(`Circular relativeTo dependency: ${cyclePath.join(" -> ")}`)
    this.name = "DependencyCycleError"
  }
}

export class MissingReferenceError extends Error {
  constructor(
    public readonly elementId: string,
    public readonly missingReferenceId: string
  ) {
    super(
      `Element "${elementId}" is relativeTo unknown element "${missingReferenceId}"`
    )
    this.name = "MissingReferenceError"
  }
}

// Orders a CompositionPlan's elements so every relative placement comes
// after whatever it's relativeTo - absolute placements have no
// dependencies and always sort first (in their original order), since a
// relative element can only ever depend on another element, never the
// reverse.
export function topologicalSort(
  elements: SemanticPlacement[]
): SemanticPlacement[] {
  const byId = new Map(elements.map((el) => [el.elementId, el]))
  const absolute = elements.filter((el) => el.placementKind === "absolute")
  const relative = elements.filter(
    (el): el is RelativePlacement => el.placementKind === "relative"
  )

  const resolved = new Set<string>()
  const visiting = new Set<string>()
  const sorted: SemanticPlacement[] = [...absolute]

  const visit = (el: RelativePlacement, path: string[]) => {
    if (resolved.has(el.elementId)) {
      return
    }
    if (visiting.has(el.elementId)) {
      throw new DependencyCycleError([...path, el.elementId])
    }

    const reference = byId.get(el.relativeTo)
    if (!reference) {
      throw new MissingReferenceError(el.elementId, el.relativeTo)
    }

    visiting.add(el.elementId)

    if (reference.placementKind === "relative") {
      visit(reference, [...path, el.elementId])
    }

    visiting.delete(el.elementId)
    resolved.add(el.elementId)
    sorted.push(el)
  }

  for (const el of relative) {
    visit(el, [el.elementId])
  }

  return sorted
}
