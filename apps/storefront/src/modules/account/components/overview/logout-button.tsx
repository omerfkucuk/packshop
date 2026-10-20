"use client"

import { ArrowRightOnRectangle } from "@medusajs/icons"
import { useParams } from "next/navigation"

import { signout } from "@lib/data/customer"

import { TILE_CLASS } from "./tile-class"

const LogoutButton = () => {
  const { countryCode } = useParams() as { countryCode: string }

  return (
    <button
      type="button"
      onClick={() => signout(countryCode)}
      className={TILE_CLASS}
      data-testid="logout-button"
    >
      <ArrowRightOnRectangle className="h-[26px] w-[26px]" />
      <span>Çıkış yap</span>
    </button>
  )
}

export default LogoutButton
