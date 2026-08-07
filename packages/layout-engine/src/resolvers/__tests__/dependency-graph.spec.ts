import {
  topologicalSort,
  DependencyCycleError,
  MissingReferenceError,
} from "../dependency-graph"
import { SemanticPlacement } from "../../domain/semantic-placement"

const absolute = (id: string): SemanticPlacement => ({
  elementId: id,
  elementType: "logo",
  content: {},
  placementKind: "absolute",
  panel: "front",
  anchor: "center",
})

const relative = (id: string, relativeTo: string): SemanticPlacement => ({
  elementId: id,
  elementType: "text",
  content: {},
  placementKind: "relative",
  panel: "front",
  relativeTo,
  position: "below",
})

describe("topologicalSort", () => {
  it("sorts absolute elements before any relative ones", () => {
    const sorted = topologicalSort([relative("slogan", "logo"), absolute("logo")])
    expect(sorted.map((el) => el.elementId)).toEqual(["logo", "slogan"])
  })

  it("resolves a chain of relative elements in dependency order", () => {
    const sorted = topologicalSort([
      relative("c", "b"),
      relative("b", "a"),
      absolute("a"),
    ])
    expect(sorted.map((el) => el.elementId)).toEqual(["a", "b", "c"])
  })

  it("throws MissingReferenceError for a relativeTo that doesn't exist", () => {
    expect(() => topologicalSort([relative("slogan", "nope")])).toThrow(
      MissingReferenceError
    )
  })

  it("throws DependencyCycleError for a circular relativeTo chain", () => {
    expect(() =>
      topologicalSort([relative("a", "b"), relative("b", "a")])
    ).toThrow(DependencyCycleError)
  })
})
