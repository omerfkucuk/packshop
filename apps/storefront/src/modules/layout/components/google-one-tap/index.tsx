"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

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
const RETRY_ATTEMPTS = 10
const RETRY_INTERVAL_MS = 1000

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
  const pathname = usePathname()
  const promptedRef = useRef(false)
  const [retrying, setRetrying] = useState(false)
  const retryCountRef = useRef(0)

  // Mirrors GoogleLoginRetry (used after the OAuth redirect flow): the store
  // API can take a few seconds to recognize a session that was just created,
  // so an immediate single refresh right after login can still render as
  // "logged out". Keep refreshing for a few seconds instead of only once.
  useEffect(() => {
    if (!retrying) {
      return
    }
    if (customer) {
      setRetrying(false)
      retryCountRef.current = 0
      return
    }
    if (retryCountRef.current >= RETRY_ATTEMPTS) {
      setRetrying(false)
      return
    }

    const timeout = setTimeout(() => {
      retryCountRef.current += 1
      router.refresh()
    }, RETRY_INTERVAL_MS)

    return () => clearTimeout(timeout)
  }, [retrying, customer, router])

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      try {
        const result = await loginWithGoogleOneTap(response.credential)
        if (result.success) {
          setRetrying(true)
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

  // Don't run One Tap on /account - the customer is already there to sign in
  // through the form/button, and having both Google Identity Services flows
  // active on the same page at once caused Chrome's own FedCM account picker
  // to surface a confusing "couldn't fetch info, click to retry" prompt on
  // top of the plain "Continue with Google" button.
  const isAccountPage = pathname?.includes("/account")

  if (customer || !GOOGLE_CLIENT_ID || isAccountPage) {
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
