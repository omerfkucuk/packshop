"use client"

import { useState } from "react"
import { Trash } from "@medusajs/icons"

type ColorListInputProps = {
  defaultColors?: string[]
}

let nextId = 0

// A small "add/remove a few hex colors" list - each row submits as a plain
// `colors` form field, so the server action can just read them all via
// `formData.getAll("colors")` like any other repeatable field.
const ColorListInput = ({ defaultColors = [] }: ColorListInputProps) => {
  const [rows, setRows] = useState(() =>
    (defaultColors.length ? defaultColors : [""]).map((value) => ({
      id: nextId++,
      value,
    }))
  )

  const updateRow = (id: number, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, value } : row)))
  }

  const removeRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { id: nextId++, value: "#000000" }])
  }

  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-sm font-semibold text-black">Renkler</span>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-x-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(row.value) ? row.value : "#000000"}
            onChange={(e) => updateRow(row.id, e.target.value)}
            className="h-10 w-10 rounded-lg border border-black/10 cursor-pointer shrink-0"
          />
          <input
            type="text"
            name="colors"
            value={row.value}
            onChange={(e) => updateRow(row.id, e.target.value)}
            placeholder="#000000"
            className="flex-1 h-10 px-3 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="h-10 w-10 flex items-center justify-center rounded-lg text-black/50 hover:bg-black/[0.04] transition-colors shrink-0"
          >
            <Trash />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-sm text-black/70 hover:text-black text-left"
      >
        + Renk ekle
      </button>
    </div>
  )
}

export default ColorListInput
