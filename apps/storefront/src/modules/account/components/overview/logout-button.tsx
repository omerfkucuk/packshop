"use client"

import { useParams } from "next/navigation"

import { signout } from "@lib/data/customer"

const LogoutButton = () => {
  const { countryCode } = useParams() as { countryCode: string }

  return (
    <button
      type="button"
      onClick={() => signout(countryCode)}
      className="rounded-full px-5 py-2.5 text-sm font-medium text-black/70 hover:bg-black/[0.04] hover:text-black transition-colors"
      data-testid="logout-button"
    >
      Çıkış yap
    </button>
  )
}

export default LogoutButton
