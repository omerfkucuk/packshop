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
      className="flex w-full flex-col gap-2 xsmall:flex-row xsmall:items-center small:w-auto"
    >
      {/* 16px on mobile so iOS Safari does not zoom the page on focus */}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta adresin"
        className="h-12 w-full min-w-0 rounded-lg border border-black/10 bg-white px-4 text-base outline-none xsmall:h-10 xsmall:flex-1 small:w-64 small:text-sm"
      />
      <button
        type="submit"
        className="h-12 w-full xsmall:h-10 xsmall:w-auto px-5 rounded-lg bg-ui-button-inverted text-white text-sm font-semibold whitespace-nowrap hover:opacity-90 transition-opacity"
      >
        Abone ol
      </button>
    </form>
  )
}

export default NewsletterForm
