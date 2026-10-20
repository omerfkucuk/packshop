"use client"

import { useParams, usePathname } from "next/navigation"

// The overview (/account) is a clean, centered page whose shortcut tiles
// replace the sidebar; every sub-page keeps the sidebar for navigation.
const AccountGrid = ({
  nav,
  children,
}: {
  nav: React.ReactNode
  children: React.ReactNode
}) => {
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const isOverview = pathname === `/${countryCode}/account`

  if (isOverview) {
    return <div className="py-12">{children}</div>
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[240px_1fr] py-12">
      <div>{nav}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default AccountGrid
