"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "@medusajs/icons"

import { Brand, deleteBrand, saveBrandInline } from "@lib/data/brands"
import Input from "@modules/common/components/input"
import GoogleFontInput from "@modules/common/components/google-font-input"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import ColorListInput from "@modules/brand-center/components/brand-card/color-list-input"
import LogoUpload from "@modules/brand-center/components/brand-card/logo-upload"
import Spinner from "@modules/common/icons/spinner"

type BrandKitPanelProps = {
  brands: Brand[]
  selectedBrandId: string | null
  onSelectBrand: (id: string) => void
}

// Creating/editing a brand used to send the customer away to the Marka
// Merkezi pages and back. This collects the same fields inline instead -
// clicking a brand opens it for editing right here, and a new brand never
// leaves the designer.
const BrandKitPanel = ({
  brands,
  selectedBrandId,
  onSelectBrand,
}: BrandKitPanelProps) => {
  const router = useRouter()
  const [mode, setMode] = useState<"list" | "form">("list")
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [formState, formAction] = useActionState(saveBrandInline, {
    success: false,
    error: null,
    brand: null,
  })

  useEffect(() => {
    if (formState.success) {
      if (formState.brand) {
        onSelectBrand(formState.brand.id)
      }
      setMode("list")
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState])

  const openCreate = () => {
    setEditingBrand(null)
    setMode("form")
  }

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand)
    onSelectBrand(brand.id)
    setMode("form")
  }

  const removeBrand = async (id: string) => {
    setRemovingId(id)
    await deleteBrand(id)
    setRemovingId(null)
    router.refresh()
  }

  if (mode === "form") {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">
            {editingBrand ? "Markayı düzenle" : "Yeni marka"}
          </h2>
          <button
            type="button"
            onClick={() => setMode("list")}
            className="text-sm text-black/50 hover:text-black"
          >
            Vazgeç
          </button>
        </div>

        {editingBrand && (
          <div className="flex flex-col gap-y-4">
            <LogoUpload
              brandId={editingBrand.id}
              currentUrl={editingBrand.logo_url}
              label="Firma logosu"
            />
            <LogoUpload
              brandId={editingBrand.id}
              currentUrl={null}
              label="Alternatif logolar"
              multiple
            />
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-y-3">
          {editingBrand && (
            <input type="hidden" name="brandId" value={editingBrand.id} />
          )}
          <Input
            label="Firma unvanı"
            name="company_name"
            defaultValue={editingBrand?.company_name || undefined}
          />
          <Input
            label="Firma markası"
            name="brand_name"
            required
            defaultValue={editingBrand?.brand_name}
          />
          <Input
            label="Slogan"
            name="slogan"
            defaultValue={editingBrand?.slogan || undefined}
          />

          <ColorListInput defaultColors={editingBrand?.colors || []} />

          <GoogleFontInput
            label="Başlık yazı tipi"
            name="heading_font"
            defaultValue={editingBrand?.heading_font || undefined}
          />
          <GoogleFontInput
            label="Gövde yazı tipi"
            name="body_font"
            defaultValue={editingBrand?.body_font || undefined}
          />

          <span className="text-sm font-semibold text-black mt-2">
            Sosyal medya
          </span>
          <Input
            label="Instagram"
            name="instagram_url"
            defaultValue={editingBrand?.instagram_url || undefined}
          />
          <Input
            label="Facebook"
            name="facebook_url"
            defaultValue={editingBrand?.facebook_url || undefined}
          />
          <Input
            label="Twitter"
            name="twitter_url"
            defaultValue={editingBrand?.twitter_url || undefined}
          />
          <Input
            label="TikTok"
            name="tiktok_url"
            defaultValue={editingBrand?.tiktok_url || undefined}
          />
          <Input
            label="Website"
            name="website_url"
            defaultValue={editingBrand?.website_url || undefined}
          />

          {formState.error && (
            <p className="text-xs text-rose-500">{formState.error}</p>
          )}

          <SubmitButton className="mt-2">
            {editingBrand ? "Güncelle" : "Kaydet"}
          </SubmitButton>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <h2 className="text-lg font-semibold text-black">Marka Kiti</h2>
      {brands.length === 0 ? (
        <p className="text-sm text-black/70">
          Henüz bir markanız yok. Logo, renk ve yazı tipinizi kullanmak için
          önce bir marka oluşturun.
        </p>
      ) : (
        <div className="flex flex-col gap-y-3">
          {brands.map((brand) => {
            const isSelected = brand.id === selectedBrandId
            return (
              <div
                key={brand.id}
                className={`flex items-center gap-x-3 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-black"
                    : "border-black/10 hover:border-black/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openEdit(brand)}
                  className="flex items-center gap-x-3 flex-1 min-w-0 text-left"
                >
                  {brand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logo_url}
                      alt={brand.brand_name}
                      className="h-10 w-10 rounded-lg border border-black/10 object-contain shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg border border-black/10 bg-black/[0.02] shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-black truncate">
                      {brand.brand_name}
                    </span>
                    {!!brand.colors?.length && (
                      <div className="flex gap-x-1 mt-1">
                        {brand.colors.slice(0, 5).map((c) => (
                          <span
                            key={c}
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeBrand(brand.id)}
                  className="text-black/40 hover:text-black shrink-0"
                  aria-label="Markayı sil"
                >
                  {removingId === brand.id ? <Spinner /> : <Trash />}
                </button>
              </div>
            )
          })}
        </div>
      )}
      <button
        type="button"
        onClick={openCreate}
        className="text-sm text-black underline underline-offset-2 hover:no-underline w-fit"
      >
        {brands.length === 0 ? "Marka oluştur" : "Yeni marka ekle"}
      </button>
    </div>
  )
}

export default BrandKitPanel
