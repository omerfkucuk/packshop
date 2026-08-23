import GoogleFontLoader from "@modules/common/components/google-font-loader"
import { TEXT_COMBOS } from "../../utils/text-combos"
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
        {TEXT_COMBOS.map((combo) => (
          <button
            key={combo.id}
            type="button"
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
            className="flex flex-col items-center justify-center gap-y-1 h-24 p-2 rounded-lg border border-black/10 hover:border-black/20 transition-colors"
          >
            <span
              className="max-w-full text-center text-base leading-tight text-black break-words"
              style={{
                fontFamily: combo.fontFamily,
                fontWeight: combo.fontWeight,
                textTransform: combo.uppercase ? "uppercase" : "none",
              }}
            >
              {combo.sampleText}
            </span>
            <span className="text-[10px] text-black/50">{combo.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TextPanel
