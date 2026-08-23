// Curated "font combination" presets for the Yazı tool - each one a
// distinct typographic treatment (family + weight + case) rather than a
// bare font list, so the picker reads as genuine style choices ("poster",
// "handwritten", "typewriter", ...) instead of just a font-name dropdown.
// Every fontFamily here must be in GOOGLE_FONTS (lib/data/google-fonts.ts)
// so GoogleFontLoader can actually load it - see text-panel/index.tsx.
export interface TextCombo {
  id: string
  label: string
  fontFamily: string
  fontWeight: number
  uppercase: boolean
}

export const TEXT_COMBOS: TextCombo[] = [
  { id: "klasik", label: "Klasik", fontFamily: "Playfair Display", fontWeight: 700, uppercase: false },
  { id: "modern", label: "Modern", fontFamily: "Poppins", fontWeight: 700, uppercase: false },
  { id: "zarif", label: "Zarif", fontFamily: "Cormorant Garamond", fontWeight: 400, uppercase: false },
  { id: "afis", label: "Afiş", fontFamily: "Anton", fontWeight: 400, uppercase: true },
  { id: "el-yazisi", label: "El Yazısı", fontFamily: "Dancing Script", fontWeight: 700, uppercase: false },
  { id: "sik", label: "Şık", fontFamily: "DM Serif Display", fontWeight: 400, uppercase: false },
  { id: "sade", label: "Sade", fontFamily: "Inter", fontWeight: 400, uppercase: false },
  { id: "retro", label: "Retro", fontFamily: "Bebas Neue", fontWeight: 400, uppercase: true },
  { id: "oyuncu", label: "Oyuncu", fontFamily: "Baloo 2", fontWeight: 700, uppercase: false },
  { id: "daktilo", label: "Daktilo", fontFamily: "Space Mono", fontWeight: 700, uppercase: true },
]

export const getTextCombo = (id: string): TextCombo | undefined =>
  TEXT_COMBOS.find((combo) => combo.id === id)
