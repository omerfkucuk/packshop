"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

type LogoUploadProps = {
  brandId: string
  currentUrl?: string | null
  label: string
  multiple?: boolean
}

// Uploads through the storefront's own /api/brands/.../logo route (a
// same-origin proxy) instead of hitting the Medusa backend directly from the
// client - keeps the auth cookie server-side only.
const LogoUpload = ({ brandId, currentUrl, label, multiple }: LogoUploadProps) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endpoint = multiple
    ? `/api/brands/${brandId}/alternate-logos`
    : `/api/brands/${brandId}/logo`

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) {
      return
    }

    setUploading(true)
    setError(null)

    const formData = new FormData()
    if (multiple) {
      Array.from(files).forEach((file) => formData.append("files", file))
    } else {
      formData.append("file", files[0])
    }

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData })
      if (!res.ok) {
        throw new Error("Yükleme başarısız oldu")
      }
      router.refresh()
    } catch {
      setError("Yükleme başarısız oldu, tekrar deneyin.")
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex flex-col gap-y-2">
      <label className="text-sm font-semibold text-black">{label}</label>
      {currentUrl && !multiple && (
        <div className="border border-black/10 rounded-lg p-4 bg-black/[0.02] w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt={label} className="h-16 object-contain" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleChange}
        disabled={uploading}
        className="text-sm text-black/70 file:mr-3 file:h-10 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-sm file:font-medium file:text-black hover:file:border-black/20 file:transition-colors"
      />
      {uploading && <span className="text-xs text-black/50">Yükleniyor...</span>}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  )
}

export default LogoUpload
