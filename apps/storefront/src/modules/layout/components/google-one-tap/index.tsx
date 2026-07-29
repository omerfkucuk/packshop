"use client"

import Script from "next/script"
import { useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import { loginWithGoogleOneTap } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

// Google Identity Services isn't published with types; this is the sliver of
// its API this component actually calls.
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
          }) => void
          prompt: () => void
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
      const result = await loginWithGoogleOneTap(response.credential)
      if (result.success) {
        router.refresh()
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
    })
    window.google.accounts.id.prompt()
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
