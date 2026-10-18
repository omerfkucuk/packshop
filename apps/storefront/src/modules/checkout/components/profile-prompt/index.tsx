"use client"

import React, { useActionState } from "react"

import { updateCustomer } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import { Heading, Text } from "@modules/common/components/ui"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

type ProfileCompletionState = { success: boolean; error: string | null }

/**
 * Collects business email + phone the first time a customer reaches
 * checkout without them, instead of forcing it right at signup. Not a
 * numbered checkout step on purpose - it isn't part of the step=... query
 * param wizard, so it can't disturb that flow's hardcoded step order. Once
 * saved, both fields are present and this renders nothing on every later
 * checkout.
 */
const ProfilePrompt = ({ customer }: { customer: HttpTypes.StoreCustomer | null }) => {
  const needsBusinessEmail = !customer?.metadata?.business_email
  const needsPhone = !customer?.phone

  const completeProfile = async (
    _currentState: ProfileCompletionState,
    formData: FormData
  ): Promise<ProfileCompletionState> => {
    try {
      await updateCustomer({
        ...(needsPhone ? { phone: formData.get("phone") as string } : {}),
        metadata: {
          ...customer?.metadata,
          ...(needsBusinessEmail
            ? { business_email: formData.get("business_email") as string }
            : {}),
        },
      })
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  const [state, formAction] = useActionState<ProfileCompletionState, FormData>(
    completeProfile,
    { success: false, error: null }
  )

  if (!customer || (!needsBusinessEmail && !needsPhone)) {
    return null
  }

  return (
    <div className="bg-white" data-testid="checkout-profile-prompt">
      <Heading level="h2" className="text-3xl-regular mb-2">
        Bilgilerinizi tamamlayın
      </Heading>
      <Text className="text-ui-fg-subtle mb-4">
        Siparişinizle ilgili sizinle iletişime geçebilmemiz için iş
        e-postanızı ve telefon numaranızı alalım.
      </Text>
      <form action={formAction}>
        <div className="grid grid-cols-1 gap-y-2">
          {needsBusinessEmail && (
            <Input
              label="İş e-postası"
              name="business_email"
              type="email"
              autoComplete="email"
              required
              data-testid="profile-prompt-business-email-input"
            />
          )}
          {needsPhone && (
            <Input
              label="Telefon"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              data-testid="profile-prompt-phone-input"
            />
          )}
        </div>
        <SubmitButton className="mt-4" data-testid="profile-prompt-submit-button">
          Kaydet
        </SubmitButton>
        <ErrorMessage error={state.error} data-testid="profile-prompt-error-message" />
      </form>
    </div>
  )
}

export default ProfilePrompt
