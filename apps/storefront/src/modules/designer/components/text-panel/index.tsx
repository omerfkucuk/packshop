import { useEffect, useState } from "react"
import GoogleFontLoader from "@modules/common/components/google-font-loader"
import { TEXT_COMBOS } from "../../utils/text-combos"
import { applyTextCase, warmUpFont } from "../../utils/measure-text"
import { SelectedElement } from "../../types"

type TextPanelProps = {
  onAddCombo: (element: SelectedElement) => void
}

const MAX_CHIP_LABEL = 24

// A gallery of ready-made font+phrase combinations - clicking one adds its
// sample phrase straight to the canvas, already styled, as a fresh,
// individually placeable text instance (same "one per add, not a single
// toggle" treatment as logos/library elements, see designer-shell's
// toggleElement). No separate "type your text first" field - all text
// entry happens on the canvas itself, by double-clicking the placed text
// to rewrite it (see dieline-preview's inline editor).
const TextPanel = ({ onAddCombo }: TextPanelProps) => {
  // A combo's font isn't clickable until warmUpFont confirms it's actually
  // ready for canvas measurement (not just CSS rendering, which is what
  // GoogleFontLoader's <link> alone guarantees) - see warmUpFont's own
  // comment for why those two can otherwise disagree, and what silently
  // broke because of it (a text element sized against the wrong font's
  // metrics, mismatching what actually got drawn).
  const [readyFonts, setReadyFonts] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    TEXT_COMBOS.forEach((combo) => {
      warmUpFont(combo.fontFamily, combo.fontWeight).then((ready) => {
        if (cancelled || !ready) return
        setReadyFonts((prev) => new Set(prev).add(combo.fontFamily))
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-y-4">
      <GoogleFontLoader fonts={TEXT_COMBOS.map((combo) => combo.fontFamily)} />
      <div>
        <h2 className="text-lg font-semibold text-black">Yazı</h2>
        <p className="text-xs text-black/50 mt-1">
          Bir yazı tipi kombinasyonu seçin, sonra kanvasta çift tıklayıp
          kendi metninizi yazın.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TEXT_COMBOS.map((combo) => {
          const ready = readyFonts.has(combo.fontFamily)
          return (
            <button
              key={combo.id}
              type="button"
              disabled={!ready}
              onClick={() =>
                onAddCombo({
                  id: `text-${combo.id}`,
                  type: "custom-text",
                  label:
                    combo.sampleText.length > MAX_CHIP_LABEL
                      ? `${combo.sampleText.slice(0, MAX_CHIP_LABEL)}…`
                      : combo.sampleText,
                  value: combo.sampleText,
                  fontFamily: combo.fontFamily,
                  fontWeight: combo.fontWeight,
                  uppercase: combo.uppercase,
                })
              }
              className={`flex flex-col items-center justify-center gap-y-1 h-24 p-2 rounded-lg border transition-colors ${
                ready
                  ? "border-black/10 hover:border-black/20"
                  : "border-black/10 opacity-40 cursor-wait"
              }`}
            >
              <span
                className="max-w-full text-center text-base leading-tight text-black break-words"
                style={{ fontFamily: combo.fontFamily, fontWeight: combo.fontWeight }}
              >
                {applyTextCase(combo.sampleText, combo.uppercase)}
              </span>
              <span className="text-[10px] text-black/50">{combo.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TextPanel
