"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

const MAX_ATTEMPTS = 10
const INTERVAL_MS = 1000

type Props = {
  active: boolean
}

// Rendered on the login view right after a Google redirect whose backend
// login already succeeded. If the account layout still shows the login form
// (see route.ts for why that can happen briefly), this retries the server
// check for a few seconds instead of leaving the customer stuck looking at a
// stale login form. It stops on its own once the layout swaps to the
// dashboard view and this component unmounts.
const GoogleLoginRetry = ({ active }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const attempts = useRef(0)

  useEffect(() => {
    if (!active) return

    const interval = setInterval(() => {
      attempts.current += 1
      router.refresh()

      if (attempts.current >= MAX_ATTEMPTS) {
        clearInterval(interval)
        router.replace(pathname)
      }
    }, INTERVAL_MS)

    return () => clearInterval(interval)
  }, [active, pathname, router])

  return null
}

export default GoogleLoginRetry
