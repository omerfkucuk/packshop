"use client"

import { useParams, usePathname } from "next/navigation"

// Marks the nav with data-home on the homepage so it (and its children,
// via group-data-[home=true]/nav variants) paints in Packshop green to
// blend into the hero. Every other page keeps the white nav.
const NavShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode?: string }
  const isHome = pathname === `/${countryCode}` || pathname === "/"

  return (
    <div
      data-home={isHome}
      className="group/nav sticky top-0 inset-x-0 z-50 bg-white data-[home=true]:bg-[#0E8345]"
    >
      {children}
    </div>
  )
}

export default NavShell
