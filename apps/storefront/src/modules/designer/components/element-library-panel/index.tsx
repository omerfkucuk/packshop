import { CheckMini } from "@medusajs/icons"
import { ELEMENT_LIBRARY } from "../../utils/element-library"
import { SelectedElement } from "../../types"

type ElementLibraryPanelProps = {
  selectedElementIds: Set<string>
  onToggleElement: (element: SelectedElement) => void
}

// Grid, not the Marka Kiti list rows - these are visual assets, browsing by
// thumbnail reads better than a text list - but reuses the same selected/
// unselected border language and CheckMini badge as ElementRow.
const ElementLibraryPanel = ({
  selectedElementIds,
  onToggleElement,
}: ElementLibraryPanelProps) => {
  return (
    <div className="flex flex-col gap-y-4">
      <div>
        <h2 className="text-lg font-semibold text-black">Elementler</h2>
        <p className="text-xs text-black/50 mt-1">
          Tasarımınıza eklemek istediğiniz öğeye tıklayın.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ELEMENT_LIBRARY.map((entry) => {
          const id = `element-${entry.id}`
          const selected = selectedElementIds.has(id)
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() =>
                onToggleElement({
                  id,
                  type: "library-element",
                  label: entry.label,
                  value: entry.id,
                })
              }
              className={`relative flex flex-col items-center gap-y-2 p-3 rounded-lg border transition-colors ${
                selected
                  ? "border-black bg-black/[0.04]"
                  : "border-black/10 hover:border-black/20"
              }`}
            >
              <span className="h-14 w-14 flex items-center justify-center text-black/70">
                <svg viewBox={entry.viewBox} className="h-full w-full">
                  {entry.markup}
                </svg>
              </span>
              <span className="text-xs text-black truncate w-full text-center">
                {entry.label}
              </span>
              {selected && (
                <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black text-white flex items-center justify-center">
                  <CheckMini />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ElementLibraryPanel
