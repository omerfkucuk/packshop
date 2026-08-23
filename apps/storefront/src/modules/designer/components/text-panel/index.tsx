import GoogleFontLoader from "@modules/common/components/google-font-loader"
import { TEXT_COMBOS } from "../../utils/text-combos"
import { SelectedElement } from "../../types"

type TextPanelProps = {
  text: string
  onTextChange: (text: string) => void
  onAddCombo: (element: SelectedElement) => void
}

const MAX_CHIP_LABEL = 24

// Standard free-text input up top, a font-combination gallery below it -
// each combo click adds a fresh, individually placeable text instance
// (same "one per add, not a single toggle" treatment as logos/library
// elements, see designer-shell's toggleElement) styled in that combo's
// font/weight/case. Disabled while the input is empty since a combo with
// no text to render wouldn't do anything.
const TextPanel = ({ text, onTextChange, onAddCombo }: TextPanelProps) => {
  const trimmed = text.trim()

  return (
    <div className="flex flex-col gap-y-4">
      <GoogleFontLoader fonts={TEXT_COMBOS.map((combo) => combo.fontFamily)} />
      <div>
        <h2 className="text-lg font-semibold text-black">Yazı</h2>
        <p className="text-xs text-black/50 mt-1">
          Metninizi yazın, sonra bir yazı tipi kombinasyonu seçin.
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Metninizi buraya yazın"
        rows={2}
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/30 resize-none"
      />
      <div className="grid grid-cols-2 gap-3">
        {TEXT_COMBOS.map((combo) => (
          <button
            key={combo.id}
            type="button"
            disabled={!trimmed}
            onClick={() =>
              onAddCombo({
                id: `text-${combo.id}`,
                type: "custom-text",
                label:
                  trimmed.length > MAX_CHIP_LABEL
                    ? `${trimmed.slice(0, MAX_CHIP_LABEL)}…`
                    : trimmed,
                value: trimmed,
                fontFamily: combo.fontFamily,
                fontWeight: combo.fontWeight,
                uppercase: combo.uppercase,
              })
            }
            className={`flex flex-col items-center justify-center gap-y-1 h-20 p-2 rounded-lg border transition-colors ${
              trimmed
                ? "border-black/10 hover:border-black/20"
                : "border-black/10 opacity-40 cursor-not-allowed"
            }`}
          >
            <span
              className="max-w-full truncate text-xl text-black"
              style={{
                fontFamily: combo.fontFamily,
                fontWeight: combo.fontWeight,
                textTransform: combo.uppercase ? "uppercase" : "none",
              }}
            >
              {trimmed || "Aa"}
            </span>
            <span className="text-[10px] text-black/50">{combo.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TextPanel
