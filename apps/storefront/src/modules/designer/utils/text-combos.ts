// Curated "font combination" presets for the Yazı tool - each one pairs a
// distinct typographic treatment (family + weight + case) with its own
// ready-made Turkish phrase, so the gallery doubles as both a font-style
// picker AND a text suggestion - click one and it's already on the
// canvas, ready to keep as-is or double-click to rewrite (see
// dieline-preview's inline editor). There's deliberately no separate
// "type your text first" input anymore - all text entry happens directly
// on the canvas.
// Every fontFamily here must be in GOOGLE_FONTS (lib/data/google-fonts.ts)
// so GoogleFontLoader can actually load it - see text-panel/index.tsx.
export interface TextCombo {
  id: string
  label: string
  sampleText: string
  fontFamily: string
  fontWeight: number
  uppercase: boolean
}

export const TEXT_COMBOS: TextCombo[] = [
  {
    id: "klasik",
    label: "Klasik",
    sampleText: "Sizin İçin",
    fontFamily: "Playfair Display",
    fontWeight: 700,
    uppercase: false,
  },
  {
    id: "modern",
    label: "Modern",
    sampleText: "Yeni Sezon",
    fontFamily: "Poppins",
    fontWeight: 700,
    uppercase: false,
  },
  {
    id: "zarif",
    label: "Zarif",
    sampleText: "Özenle Hazırlandı",
    fontFamily: "Cormorant Garamond",
    fontWeight: 400,
    uppercase: false,
  },
  {
    id: "afis",
    label: "Afiş",
    sampleText: "İndirim",
    fontFamily: "Anton",
    fontWeight: 400,
    uppercase: true,
  },
  {
    id: "el-yazisi",
    label: "El Yazısı",
    sampleText: "Bu Senin İçin",
    fontFamily: "Dancing Script",
    fontWeight: 700,
    uppercase: false,
  },
  {
    id: "sik",
    label: "Şık",
    sampleText: "Teşekkür Ederiz",
    fontFamily: "DM Serif Display",
    fontWeight: 400,
    uppercase: false,
  },
  {
    id: "sade",
    label: "Sade",
    sampleText: "Afiyet Olsun",
    fontFamily: "Inter",
    fontWeight: 400,
    uppercase: false,
  },
  {
    id: "retro",
    label: "Retro",
    sampleText: "El Yapımı",
    fontFamily: "Bebas Neue",
    fontWeight: 400,
    uppercase: true,
  },
  {
    id: "oyuncu",
    label: "Oyuncu",
    sampleText: "Hoş Geldin",
    fontFamily: "Baloo 2",
    fontWeight: 700,
    uppercase: false,
  },
  {
    id: "daktilo",
    label: "Daktilo",
    sampleText: "İyi Günlerde Kullanın",
    fontFamily: "Space Mono",
    fontWeight: 700,
    uppercase: true,
  },
]

export const getTextCombo = (id: string): TextCombo | undefined =>
  TEXT_COMBOS.find((combo) => combo.id === id)
