import type {
  CompositionPlan,
  ElementType,
  SemanticPanelName,
  SemanticPlacement,
} from "@dtc/layout-engine"
import type { ThemeDefinition } from "../domain/theme"

export type TemplateSlot =
  | "brand-logo"
  | "brand-slogan"
  | "brand-social-link"
  | { libraryElement: string }

export interface SlotResolution {
  elementType: ElementType
  content: Record<string, unknown>
}

// Returns null when the slot has nothing to place (e.g. the brand has no
// slogan, or a referenced library element doesn't exist in the caller's
// catalog) - resolveThemeTemplate() simply skips that element rather than
// treating it as an error, the same way MockLlmProvider silently omits the
// slogan when none is selected.
export type SlotResolver = (slot: TemplateSlot) => SlotResolution | null

// The instant, no-AI, no-network counterpart to composeDesign(): builds a
// CompositionPlan straight from a theme's `defaults`, mirroring
// MockLlmProvider's per-panel loop almost exactly, but every element's
// content comes from `resolveSlot` instead of a hardcoded selectedElements
// lookup. Deliberately catalog-agnostic - this package never imports the
// caller's brand data or element library, so the storefront (or any future
// caller) supplies both via `resolveSlot`.
export function resolveThemeTemplate(
  theme: ThemeDefinition,
  boxType: string,
  availablePanels: SemanticPanelName[],
  resolveSlot: SlotResolver
): CompositionPlan {
  const { defaults } = theme

  const logo = resolveSlot("brand-logo")
  const slogan = resolveSlot("brand-slogan")
  const decorative = defaults.decorativeElement
    ? resolveSlot({ libraryElement: defaults.decorativeElement.libraryElementId })
    : null
  const social = defaults.includeSocialLink ? resolveSlot("brand-social-link") : null

  const sloganPanels = defaults.sloganOnEveryPanel
    ? availablePanels
    : availablePanels.slice(0, 1)

  const elements: SemanticPlacement[] = []

  availablePanels.forEach((panel, index) => {
    const logoId = `logo-${panel}`

    if (logo) {
      elements.push({
        elementId: logoId,
        elementType: logo.elementType,
        content: logo.content,
        placementKind: "absolute",
        panel,
        anchor: defaults.logoAnchor,
        size: defaults.logoSize,
      })
    }

    if (slogan && sloganPanels.includes(panel)) {
      const base = {
        elementId: `slogan-${panel}`,
        elementType: slogan.elementType,
        content: slogan.content,
        size: "medium" as const,
      }

      elements.push(
        logo
          ? {
              ...base,
              placementKind: "relative",
              panel,
              relativeTo: logoId,
              position: "below",
              gapHint: defaults.gapHint,
            }
          : {
              ...base,
              placementKind: "absolute",
              panel,
              anchor: defaults.logoAnchor,
            }
      )
    }

    if (decorative && defaults.decorativeElement) {
      elements.push({
        elementId: `decorative-${panel}`,
        elementType: decorative.elementType,
        content: decorative.content,
        placementKind: "absolute",
        panel,
        anchor: defaults.decorativeElement.anchor,
        size: defaults.decorativeElement.size,
      })
    }

    // Only the first panel, regardless of sloganOnEveryPanel - a social
    // link repeated on every face would compete with the decorative
    // element/logo more than it adds.
    if (social && index === 0) {
      elements.push({
        elementId: `social-${panel}`,
        elementType: social.elementType,
        content: social.content,
        placementKind: "absolute",
        panel,
        anchor: "bottom-center",
        size: "small",
      })
    }
  })

  return {
    version: "1.0",
    boxType,
    elements,
    metadata: {
      aiModel: "theme-template-v1",
      generatedAt: new Date().toISOString(),
    },
  }
}
