"use client"

import { useParams, useRouter } from "next/navigation"
import { MagnifyingGlass } from "@medusajs/icons"
import { FormEvent, useState } from "react"

const SearchBar = () => {
  const [value, setValue] = useState("")
  const router = useRouter()
  const { countryCode } = useParams()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) {
      return
    }
    router.push(`/${countryCode}/store?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="hidden small:flex items-center flex-1 h-10 rounded-full bg-black/[0.04] px-4 gap-2 text-ui-fg-subtle"
    >
      <MagnifyingGlass />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ürün ara..."
        className="flex-1 h-full bg-transparent outline-none text-sm text-ui-fg-base placeholder:text-ui-fg-subtle"
      />
    </form>
  )
}

export default SearchBar
