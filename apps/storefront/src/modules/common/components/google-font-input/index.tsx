"use client"

import { useId } from "react"
import Input from "@modules/common/components/input"
import { GOOGLE_FONTS } from "@lib/data/google-fonts"

type GoogleFontInputProps = {
  label: string
  name: string
  defaultValue?: string
}

// A plain text Input with a native <datalist> autocomplete - lets the
// customer pick from known Google Fonts while still allowing a free-typed
// name (no dependency on Google's paid/keyed Developer API for the list).
const GoogleFontInput = ({ label, name, defaultValue }: GoogleFontInputProps) => {
  const listId = useId()

  return (
    <>
      <Input
        label={label}
        name={name}
        defaultValue={defaultValue}
        list={listId}
        autoComplete="off"
        data-testid={`${name}-input`}
      />
      <datalist id={listId}>
        {GOOGLE_FONTS.map((font) => (
          <option key={font} value={font} />
        ))}
      </datalist>
    </>
  )
}

export default GoogleFontInput
