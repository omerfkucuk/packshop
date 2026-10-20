"use client"

import { usePathname } from "next/navigation"

// Hides site-wide chrome (e.g. the footer newsletter banner) on the
// /[countryCode]/account pages, which are meant to stay minimal.
const HideOnAccount = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  if (/^\/[^/]+\/account(\/|$)/.test(pathname)) {
    return null
  }

  return <>{children}</>
}

export default HideOnAccount
