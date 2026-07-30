"use client"

import Script from "next/script"
import { useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import { loginWithGoogleOneTap } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

// Google Identity Services isn't published with types; this is the sliver of
// its API this component actually calls.
type PromptMomentNotification = {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
  getDismissedReason: () => string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            use_fedcm_for_prompt?: boolean
            itp_support?: boolean
          }) => void
          prompt: (
            momentListener?: (notification: PromptMomentNotification) => void
          ) => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

// Shows Google's own One Tap prompt (the small "Sign in as ___" card Google
// renders itself, fixed to the top-right of the viewport) to anyone who
// isn't logged in yet and has an active Google session in their browser -
// no click needed to trigger it, unlike the header's "Continue with Google"
// button which starts a full OAuth redirect.
const GoogleOneTap = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const router = useRouter()
  const promptedRef = useRef(false)

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      try {
        const result = await loginWithGoogleOneTap(response.credential)
        if (result.success) {
          router.refresh()
        } else {
          console.error("Google One Tap login failed:", result.error)
        }
      } catch (error) {
        console.error("Google One Tap login threw:", error)
      }
    },
    [router]
  )

  const showPrompt = useCallback(() => {
    if (promptedRef.current || !window.google || !GOOGLE_CLIENT_ID) {
      return
    }
    promptedRef.current = true

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      // Chrome requires One Tap to go through FedCM (Federated Credential
      // Management) now - without this the prompt can render but silently
      // fail to hand back a credential on account selection.
      use_fedcm_for_prompt: true,
      itp_support: true,
    })

    // The moment listener isn't needed for the happy path, but without it
    // a suppressed/skipped prompt (e.g. Google's own cooldown after a
    // previous dismissal) fails completely silently - this at least surfaces
    // *why* in the console instead of just "nothing happened".
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.log(
          "Google One Tap not displayed:",
          notification.getNotDisplayedReason()
        )
      } else if (notification.isSkippedMoment()) {
        console.log("Google One Tap skipped:", notification.getSkippedReason())
      }
    })
  }, [handleCredential])

  if (customer || !GOOGLE_CLIENT_ID) {
    return null
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={showPrompt}
    />
  )
}

export default GoogleOneTap
