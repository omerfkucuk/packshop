"use client"

import { useParams, usePathname } from "next/navigation"

import BackToAccount from "../back-to-account"

// The overview (/account) is the navigation hub; every sub-page gets a
// back link to it instead of a sidebar.
const AccountGrid = ({
  showBackLink,
  children,
}: {
  showBackLink: boolean
  children: React.ReactNode
}) => {
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const isOverview = pathname === `/${countryCode}/account`

  return (
    <div className="py-12">
      {showBackLink && !isOverview && <BackToAccount />}
      {children}
    </div>
  )
}

export default AccountGrid
