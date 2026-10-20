"use client"

import React, { useEffect, useActionState } from "react"

import Input from "@modules/common/components/input"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

// Stored in metadata.business_email - the same key the checkout profile
// prompt fills and the Twenty CRM sync reads. The free-mail domain check
// lives in the backend (validate-business-email middleware); its message
// comes back through updateCustomer's thrown error.
const ProfileBusinessEmail: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = React.useState(false)
  const businessEmail = customer.metadata?.business_email as string | undefined

  const updateBusinessEmail = async (
    _currentState: Record<string, unknown>,
    formData: FormData
  ) => {
    try {
      await updateCustomer({
        metadata: {
          ...customer.metadata,
          business_email: formData.get("business_email") as string,
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

  const [state, formAction] = useActionState(updateBusinessEmail, {
    error: null as string | null,
    success: false,
  })

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Şirket e-postası"
        currentInfo={businessEmail || "Henüz eklenmedi"}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error || undefined}
        clearState={clearState}
        data-testid="account-business-email-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label="Şirket e-postası"
            name="business_email"
            type="email"
            autoComplete="work email"
            required
            defaultValue={businessEmail ?? ""}
            data-testid="business-email-input"
          />
          <p className="text-xs text-black/50">
            Şirketinizin alan adına ait bir adres girin (ör. ad@sirketiniz.com).
            Gmail, Hotmail gibi kişisel adresler kabul edilmez.
          </p>
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileBusinessEmail
