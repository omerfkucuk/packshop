"use client"

import { FormEvent, useState } from "react"

const NewsletterForm = () => {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="txt-small-plus text-ui-fg-base">
        Teşekkürler! E-posta adresini aldık.
      </p>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full small:w-auto items-center gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta adresin"
        className="h-10 flex-1 small:w-64 rounded-lg border border-black/10 px-4 text-sm outline-none bg-white"
      />
      <button
        type="submit"
        className="h-10 px-5 rounded-lg bg-ui-button-inverted text-white text-sm font-semibold whitespace-nowrap hover:opacity-90 transition-opacity"
      >
        Abone ol
      </button>
    </form>
  )
}

export default NewsletterForm
