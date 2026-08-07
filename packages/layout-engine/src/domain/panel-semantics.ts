import type { SemanticPanelName, SizeHint } from "./semantic-placement"

// How a specific box style's semantic panel names (from AI's point of
// view) map onto its real, physical PanelGeometry.panelName values (e.g.
// FEFCO 0201's "front" -> "Panel-L1"). Not every box style has all six
// semantic panels (a box has no meaningful "top"/"bottom" print surface
// once flaps are folded, for instance) - omitted keys are simply
// unavailable to the AI/plan for that box type.
export type PanelSemanticsMap = Partial<Record<SemanticPanelName, string>>

// A box style can optionally override the default small/medium/large size
// fractions (see resolvers/size-resolver.ts) - e.g. a much bigger box
// might want "large" to mean a smaller fraction of the zone than a small
// box would, to avoid a logo that's technically "large" but visually tiny
// relative to real-world print area.
export type SizeBucketOverrides = Partial<Record<SizeHint, number>>
