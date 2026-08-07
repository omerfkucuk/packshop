"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PencilSquare, Trash } from "@medusajs/icons"

import { Brand, deleteBrand, saveBrandInline } from "@lib/data/brands"
import Input from "@modules/common/components/input"
import GoogleFontInput from "@modules/common/components/google-font-input"
import GoogleFontLoader from "@modules/common/components/google-font-loader"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import ColorListInput from "@modules/brand-center/components/brand-card/color-list-input"
import LogoUpload from "@modules/brand-center/components/brand-card/logo-upload"
import Spinner from "@modules/common/icons/spinner"
import { SelectedElement } from "../../types"

type BrandKitPanelProps = {
  brands: Brand[]
  selectedBrandId: string | null
  onSelectBrand: (id: string) => void
  selectedElementIds: Set<string>
  onToggleElement: (element: SelectedElement) => void
}

const chipClassName = (selected: boolean) =>
  `h-9 min-w-9 px-2 flex items-center justify-center gap-x-1 rounded-lg border text-xs transition-colors ${
    selected
      ? "border-black bg-black/[0.04]"
      : "border-black/10 hover:border-black/20"
  }`

// Creating/editing a brand used to send the customer away to the Marka
// Merkezi pages and back. This collects the same fields inline instead -
// clicking a brand opens it for editing right here, and a new brand never
// leaves the designer.
const BrandKitPanel = ({
  brands,
  selectedBrandId,
  onSelectBrand,
  selectedElementIds,
  onToggleElement,
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
      <GoogleFontLoader
        fonts={brands.flatMap((b) => [b.heading_font, b.body_font])}
      />
      <div>
        <h2 className="text-lg font-semibold text-black">Marka Kiti</h2>
        <p className="text-xs text-black/50 mt-1">
          Logo, renk ve yazı tipine tıklayarak aşağıdaki AI alanına ekleyin.
        </p>
      </div>
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
                className={`flex flex-col gap-y-2 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-black"
                    : "border-black/10 hover:border-black/20"
                }`}
              >
                <div className="flex items-center justify-between gap-x-2">
                  <span className="text-sm font-medium text-black truncate">
                    {brand.brand_name}
                  </span>
                  <div className="flex items-center gap-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(brand)}
                      className="text-black/40 hover:text-black"
                      aria-label="Markayı düzenle"
                    >
                      <PencilSquare />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBrand(brand.id)}
                      className="text-black/40 hover:text-black"
                      aria-label="Markayı sil"
                    >
                      {removingId === brand.id ? <Spinner /> : <Trash />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {brand.logo_url && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleElement({
                          id: `logo-${brand.id}`,
                          type: "logo",
                          label: "Logo",
                          value: brand.logo_url!,
                        })
                      }
                      className={chipClassName(
                        selectedElementIds.has(`logo-${brand.id}`)
                      )}
                      title="Logo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={brand.logo_url}
                        alt="Logo"
                        className="h-5 w-5 object-contain"
                      />
                    </button>
                  )}
                  {brand.colors?.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        onToggleElement({
                          id: `color-${brand.id}-${color}`,
                          type: "color",
                          label: color,
                          value: color,
                        })
                      }
                      className={chipClassName(
                        selectedElementIds.has(`color-${brand.id}-${color}`)
                      )}
                      title={color}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                  {brand.heading_font && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleElement({
                          id: `font-heading-${brand.id}`,
                          type: "font",
                          label: brand.heading_font!,
                          value: brand.heading_font!,
                        })
                      }
                      className={chipClassName(
                        selectedElementIds.has(`font-heading-${brand.id}`)
                      )}
                      title={`Başlık: ${brand.heading_font}`}
                    >
                      <span style={{ fontFamily: brand.heading_font }}>
                        Aa
                      </span>
                    </button>
                  )}
                  {brand.body_font && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleElement({
                          id: `font-body-${brand.id}`,
                          type: "font",
                          label: brand.body_font!,
                          value: brand.body_font!,
                        })
                      }
                      className={chipClassName(
                        selectedElementIds.has(`font-body-${brand.id}`)
                      )}
                      title={`Gövde: ${brand.body_font}`}
                    >
                      <span style={{ fontFamily: brand.body_font }}>Aa</span>
                    </button>
                  )}
                </div>
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
