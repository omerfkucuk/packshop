import type { AnchorPoint, SizeHint, SpacingHint } from "@dtc/layout-engine"

export type ThemeId = "sade" | "premium" | "sicak" | "eglenceli"

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  /** Sent as-is to a real LlmProvider's prompt later - kept human-readable
   *  rather than encoded, since the whole point is to bias free-text
   *  generation, not to replace it with rules. */
  styleGuidance: string
  /** What a provider with no better judgement (e.g. MockLlmProvider,
   *  or a real one before it learns better) falls back to. */
  defaults: {
    logoAnchor: AnchorPoint
    logoSize: SizeHint
    gapHint: SpacingHint
    sloganOnEveryPanel: boolean
  }
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  sade: {
    id: "sade",
    label: "Sade",
    description: "Az öğe, bol boşluk, tek bir net vurgu.",
    styleGuidance:
      "Minimalist bir kompozisyon kur: sadece gerekli öğeleri kullan, boşluğu " +
      "bir tasarım elemanı gibi kullan, tek bir net odak noktası yarat.",
    defaults: {
      logoAnchor: "center",
      logoSize: "small",
      gapHint: "loose",
      sloganOnEveryPanel: false,
    },
  },
  premium: {
    id: "premium",
    label: "Premium",
    description: "Büyük, iddialı logo; sade ve nötr bir sunum.",
    styleGuidance:
      "Lüks/premium bir his ver: logoyu büyük ve iddialı bas, gereksiz öğe " +
      "ekleme, ince ve nötr bir tipografi kullan, kutunun her yüzünü doldurma.",
    defaults: {
      logoAnchor: "center",
      logoSize: "large",
      gapHint: "loose",
      sloganOnEveryPanel: false,
    },
  },
  sicak: {
    id: "sicak",
    label: "Sıcak",
    description: "Samimi ve davetkar; logo ve slogan her yüzde bir arada.",
    styleGuidance:
      "Sıcak ve samimi bir his ver: logo ve slogan birlikte, birbirine yakın " +
      "dursun, kutunun her ana yüzünde aynı sıcak anlatım tekrar etsin.",
    defaults: {
      logoAnchor: "center",
      logoSize: "medium",
      gapHint: "normal",
      sloganOnEveryPanel: true,
    },
  },
  eglenceli: {
    id: "eglenceli",
    label: "Eğlenceli",
    description: "Merkezden kaçan, hareketli ve enerjik bir yerleşim.",
    styleGuidance:
      "Enerjik ve oyunbaz bir his ver: öğeleri tam ortaya değil köşelere/" +
      "kenarlara yakın yerleştir, öğeler arasındaki boşluğu sıkı tut.",
    defaults: {
      logoAnchor: "top-left",
      logoSize: "medium",
      gapHint: "tight",
      sloganOnEveryPanel: true,
    },
  },
}

export const listThemes = (): ThemeDefinition[] => Object.values(THEMES)
