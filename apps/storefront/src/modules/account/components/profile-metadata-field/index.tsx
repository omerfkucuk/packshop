"use client"

import React, { useEffect, useActionState } from "react"

import Input from "@modules/common/components/input"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"

type ProfileMetadataFieldProps = {
  customer: HttpTypes.StoreCustomer
  /** Key under customer.metadata - also what the Twenty sync reads. */
  field: string
  label: string
  type?: string
  placeholder?: string
  hint?: string
}

// A single optional text value kept in customer.metadata (job title,
// LinkedIn, ...). Any validation lives in the backend's
// /store/customers/me middleware; its message surfaces as the row error.
const ProfileMetadataField: React.FC<ProfileMetadataFieldProps> = ({
  customer,
  field,
  label,
  type = "text",
  placeholder,
  hint,
}) => {
  const [successState, setSuccessState] = React.useState(false)
  const value = customer.metadata?.[field] as string | undefined

  const updateField = async (
    _currentState: Record<string, unknown>,
    formData: FormData
  ) => {
    try {
      await updateCustomer({
        metadata: {
          ...customer.metadata,
          [field]: ((formData.get(field) as string) || "").trim(),
        },
      })
      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const [state, formAction] = useActionState(updateField, {
    error: null as string | null,
    success: false,
  })

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label={label}
        currentInfo={value || "Henüz eklenmedi"}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error || undefined}
        clearState={() => setSuccessState(false)}
        data-testid={`account-${field}-editor`}
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label={placeholder ?? label}
            name={field}
            type={type}
            defaultValue={value ?? ""}
            data-testid={`${field}-input`}
          />
          {hint && <p className="text-xs text-black/50">{hint}</p>}
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileMetadataField
