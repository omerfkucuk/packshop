import { Disclosure } from "@headlessui/react"
import { Button, clx } from "@modules/common/components/ui"
import { useEffect } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import { useFormStatus } from "react-dom"

type AccountInfoProps = {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  errorMessage?: string
  clearState: () => void
  /** Display-only row: no chevron, no edit form. */
  readOnly?: boolean
  children?: React.ReactNode
  'data-testid'?: string
}

// One Uber-style row on the profile page: label over a muted value, the
// whole row toggles an inline edit form. Rows draw their own bottom border,
// so stack them without dividers.
const AccountInfo = ({
  label,
  currentInfo,
  isSuccess,
  isError,
  clearState,
  readOnly = false,
  errorMessage = "Bir hata oluştu, lütfen tekrar deneyin",
  children,
  'data-testid': dataTestid
}: AccountInfoProps) => {
  const { state, close, toggle } = useToggleState()

  const { pending } = useFormStatus()

  const handleToggle = () => {
    clearState()
    toggle()
  }

  useEffect(() => {
    if (isSuccess) {
      close()
    }
  }, [isSuccess, close])

  const value =
    typeof currentInfo === "string" ? (
      <span className="text-base text-black/60" data-testid="current-info">
        {currentInfo}
      </span>
    ) : (
      currentInfo
    )

  return (
    <div className="border-b border-black/10" data-testid={dataTestid}>
      {readOnly ? (
        <div className="flex flex-col gap-y-1 py-5">
          <span className="text-base font-medium text-black">{label}</span>
          {value}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className="flex w-full items-center justify-between gap-x-4 py-5 text-left"
          data-testid="edit-button"
          data-active={state}
        >
          <div className="flex flex-col gap-y-1 min-w-0">
            <span className="text-base font-medium text-black">{label}</span>
            {value}
            {isSuccess && (
              <span className="text-sm text-green-700" data-testid="success-message">
                {label} güncellendi
              </span>
            )}
          </div>
          <ChevronDown
            className={clx("shrink-0 text-black/30 transition-transform", {
              "-rotate-90": !state,
            })}
          />
        </button>
      )}

      {/* Error state  */}
      <Disclosure>
        <Disclosure.Panel
          static
          className={clx(
            "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
            {
              "max-h-[1000px] opacity-100": isError,
              "max-h-0 opacity-0": !isError,
            }
          )}
          data-testid="error-message"
        >
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        </Disclosure.Panel>
      </Disclosure>

      {!readOnly && (
        <Disclosure>
          <Disclosure.Panel
            static
            className={clx(
              "transition-[max-height,opacity] duration-300 ease-in-out overflow-visible",
              {
                "max-h-[1000px] opacity-100": state,
                "max-h-0 opacity-0 pointer-events-none overflow-hidden": !state,
              }
            )}
          >
            <div className="flex flex-col gap-y-2 pb-6">
              <div>{children}</div>
              <div className="flex items-center justify-end gap-x-2 mt-2">
                <Button
                  variant="secondary"
                  type="reset"
                  onClick={handleToggle}
                  data-testid="cancel-button"
                >
                  Vazgeç
                </Button>
                <Button
                  isLoading={pending}
                  className="small:min-w-[120px]"
                  type="submit"
                  data-testid="save-button"
                >
                  Kaydet
                </Button>
              </div>
            </div>
          </Disclosure.Panel>
        </Disclosure>
      )}
    </div>
  )
}

export default AccountInfo
