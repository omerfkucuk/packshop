"use client"

import { useParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const NAV_HEIGHT = 64

// On the homepage the nav paints in Packshop green while the green hero
// (marked data-nav-hero) is behind it, then turns back to white once the
// hero has scrolled out from under it. Children react through
// group-data-[home=true]/nav variants. Every other page keeps the white nav.
const NavShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode?: string }
  const isHome = pathname === `/${countryCode}` || pathname === "/"
  const [overHero, setOverHero] = useState(true)

  useEffect(() => {
    if (!isHome) return
    const update = () => {
      const hero = document.querySelector("[data-nav-hero]")
      setOverHero(hero ? hero.getBoundingClientRect().bottom > NAV_HEIGHT : window.scrollY < 10)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [isHome])

  return (
    <div
      data-home={isHome && overHero}
      className="group/nav sticky top-0 inset-x-0 z-50 bg-white transition-colors duration-200 data-[home=true]:bg-[#0E8345]"
    >
      {children}
    </div>
  )
}

export default NavShell
