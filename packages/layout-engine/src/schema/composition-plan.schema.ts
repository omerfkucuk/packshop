import { z } from "zod"

// Source of truth for what a valid CompositionPlan looks like, mirroring
// domain/semantic-placement.ts exactly. Every LlmProvider's output gets
// parsed against this before it ever reaches resolveLayout() - never trust
// raw LLM JSON (see the architecture doc's AI Service section, step 3).

export const ElementTypeSchema = z.enum([
  "logo",
  "text",
  "qr",
  "barcode",
  "image",
  "icon",
  "shape",
  "pattern",
  "reference-image",
  "ai-generated",
])

export const SemanticPanelNameSchema = z.enum([
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
])

export const AnchorPointSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
])

export const RelativePositionSchema = z.enum([
  "above",
  "below",
  "left-of",
  "right-of",
  "inside",
])

export const SizeHintSchema = z.enum([
  "small",
  "medium",
  "large",
  "full-width",
  "full-height",
])

export const SpacingHintSchema = z.enum(["tight", "normal", "loose"])

const semanticElementBase = {
  elementId: z.string().min(1),
  elementType: ElementTypeSchema,
  content: z.record(z.string(), z.unknown()),
  sourceElementId: z.string().min(1).optional(),
}

export const AbsolutePlacementSchema = z.object({
  ...semanticElementBase,
  placementKind: z.literal("absolute"),
  panel: SemanticPanelNameSchema,
  anchor: AnchorPointSchema,
  size: SizeHintSchema.optional(),
  marginHint: SpacingHintSchema.optional(),
})

export const RelativePlacementSchema = z.object({
  ...semanticElementBase,
  placementKind: z.literal("relative"),
  panel: SemanticPanelNameSchema,
  relativeTo: z.string().min(1),
  position: RelativePositionSchema,
  gapHint: SpacingHintSchema.optional(),
  size: SizeHintSchema.optional(),
})

export const SemanticPlacementSchema = z.discriminatedUnion("placementKind", [
  AbsolutePlacementSchema,
  RelativePlacementSchema,
])

export const CompositionPlanSchema = z.object({
  version: z.literal("1.0"),
  boxType: z.string().min(1),
  elements: z.array(SemanticPlacementSchema),
  metadata: z
    .object({
      promptUsed: z.string().optional(),
      aiModel: z.string().optional(),
      generatedAt: z.string(),
    })
    .optional(),
})
