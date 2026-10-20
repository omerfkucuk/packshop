"use client"

import React, { useActionState, useEffect } from "react"

import { updateBillingFields } from "@lib/data/billing"
import AccountInfo from "@modules/account/components/account-info"
import Input from "@modules/common/components/input"

type BillingRowField = {
  name: "company" | "address_1" | "city" | "tax_number" | "tax_office"
  label: string
  defaultValue?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue">

type BillingRowProps = {
  label: string
  currentInfo: string | undefined
  fields: BillingRowField[]
  "data-testid"?: string
}

// One Firma bilgileri row - same look/behavior as the Kişisel bilgiler rows
// (AccountInfo), saving only its own fields into the billing address.
const BillingRow = ({ label, currentInfo, fields, "data-testid": testId }: BillingRowProps) => {
  const [successState, setSuccessState] = React.useState(false)

  const save = async (
    _currentState: { success: boolean; error: string | null },
    formData: FormData
  ) => {
    try {
      await updateBillingFields(
        Object.fromEntries(
          fields.map((f) => [f.name, ((formData.get(f.name) as string) || "").trim()])
        )
      )
      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const [state, formAction] = useActionState(save, { success: false, error: null })

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label={label}
        currentInfo={currentInfo || "Henüz eklenmedi"}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error || undefined}
        clearState={() => setSuccessState(false)}
        data-testid={testId}
      >
        <div className="grid grid-cols-1 gap-y-2">
          {fields.map(({ name, label: fieldLabel, defaultValue, ...inputProps }) => (
            <Input
              key={name}
              name={name}
              label={fieldLabel}
              required
              defaultValue={defaultValue ?? ""}
              data-testid={`${name}-input`}
              {...inputProps}
            />
          ))}
        </div>
      </AccountInfo>
    </form>
  )
}

export default BillingRow
