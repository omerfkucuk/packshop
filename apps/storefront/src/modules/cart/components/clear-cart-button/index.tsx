"use client"

import { useState } from "react"

import { deleteLineItem } from "@lib/data/cart"
import Spinner from "@modules/common/icons/spinner"
import Trash from "@modules/common/icons/trash"

// Two-step on purpose (no confirm() in this UI): first click arms it.
const ClearCartButton = ({ lineIds }: { lineIds: string[] }) => {
  const [armed, setArmed] = useState(false)
  const [clearing, setClearing] = useState(false)

  const clear = async () => {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 4000)
      return
    }
    setClearing(true)
    for (const id of lineIds) {
      await deleteLineItem(id).catch(() => {})
    }
    setClearing(false)
    setArmed(false)
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={clearing}
      className="flex items-center gap-x-2 rounded-lg px-3 py-2 text-sm text-black/60 hover:bg-black/[0.04] hover:text-black transition-colors"
      data-testid="clear-cart-button"
    >
      {clearing ? <Spinner /> : <Trash size={16} />}
      {armed ? "Emin misiniz? Tekrar tıklayın" : "Tümünü kaldır"}
    </button>
  )
}

export default ClearCartButton
