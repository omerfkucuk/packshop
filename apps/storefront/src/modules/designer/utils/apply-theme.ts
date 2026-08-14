import type { PanelGeometry } from "@dtc/packaging-engine/shared"
import { resolveLayout } from "@dtc/layout-engine"
import {
  resolveThemeTemplate,
  type SlotResolver,
} from "@dtc/ai-composer/use-cases"
import type { ThemeDefinition } from "@dtc/ai-composer/domain"
import type { Brand } from "@lib/data/brands"
import { getLibraryElement } from "./element-library"
import { FEFCO_0201_PANEL_SEMANTICS, MAIN_PANELS } from "./panel-semantics"
import type { ResolveDesignResult } from "./apply-design"

const SOCIAL_URL_FIELDS = [
  "instagram_url",
  "facebook_url",
  "twitter_url",
  "tiktok_url",
  "website_url",
] as const

function buildSlotResolver(brand: Brand): SlotResolver {
  return (slot) => {
    if (slot === "brand-logo") {
      return brand.logo_url ? { elementType: "logo", content: { url: brand.logo_url } } : null
    }
    if (slot === "brand-slogan") {
      return brand.slogan
        ? { elementType: "text", content: { text: brand.slogan, font: brand.body_font } }
        : null
    }
    if (slot === "brand-social-link") {
      const link = SOCIAL_URL_FIELDS.map((field) => brand[field]).find(Boolean)
      return link ? { elementType: "text", content: { text: link } } : null
    }
    const entry = getLibraryElement(slot.libraryElement)
    if (!entry) return null
    return {
      elementType: entry.category,
      content: {
        libraryElementId: entry.id,
        // Never the same as backgroundColors' brand.colors[0] below - a
        // decorative element recolored to match its own panel background
        // would be invisible. A brand's secondary color if it has one,
        // otherwise white (a light decorative texture over a solid brand
        // background reads fine for most brand colors).
        color: entry.recolorable ? brand.colors?.[1] ?? "#ffffff" : undefined,
      },
    }
  }
}

// The instant, AI-free counterpart to generateAiDesign(): resolves a
// theme's fixed template against a real Brand + the element library, then
// runs it through the exact same resolveLayout() the rule-based default
// and the AI path both use - no network call, no cost.
export function applyTheme(
  panels: PanelGeometry[],
  theme: ThemeDefinition,
  brand: Brand
): ResolveDesignResult {
  const plan = resolveThemeTemplate(theme, "fefco-0201", MAIN_PANELS, buildSlotResolver(brand))

  const resolvedLayout = resolveLayout(plan, panels, {
    panelSemantics: FEFCO_0201_PANEL_SEMANTICS,
  })

  const backgroundColors: Record<string, string> = {}
  const color = brand.colors?.[0]
  if (color) {
    for (const physicalPanelName of Object.values(FEFCO_0201_PANEL_SEMANTICS)) {
      if (physicalPanelName) backgroundColors[physicalPanelName] = color
    }
  }

  return { resolvedLayout, backgroundColors }
}
