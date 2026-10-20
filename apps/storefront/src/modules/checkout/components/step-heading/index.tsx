import { CheckCircleSolid } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"

type StepHeadingProps = {
  number: number
  title: string
  /** Step completed and collapsed - shows a check instead of the number. */
  done?: boolean
  /** Step not reachable yet - dims the heading. */
  inactive?: boolean
  onEdit?: () => void
  editTestId?: string
}

// Shared header for the numbered checkout steps (Teslimat → Kargo → Ödeme → Onay).
const StepHeading = ({ number, title, done, inactive, onEdit, editTestId }: StepHeadingProps) => (
  <div className="flex items-center justify-between py-6">
    <h2
      className={clx("flex items-center gap-x-3 text-2xl font-bold tracking-tight", {
        "text-black": !inactive,
        "text-black/30": inactive,
      })}
    >
      {done ? (
        <CheckCircleSolid className="h-7 w-7 text-green-600" />
      ) : (
        <span
          className={clx(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
            inactive ? "bg-black/10 text-black/40" : "bg-black text-white"
          )}
        >
          {number}
        </span>
      )}
      {title}
    </h2>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="text-sm text-black underline underline-offset-4 hover:no-underline"
        data-testid={editTestId}
      >
        Düzenle
      </button>
    )}
  </div>
)

export default StepHeading
