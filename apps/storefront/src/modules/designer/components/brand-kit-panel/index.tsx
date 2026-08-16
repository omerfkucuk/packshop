"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckMini,
  Link as LinkIcon,
  PencilSquare,
  Text as TextIcon,
  Trash,
} from "@medusajs/icons"

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

const SOCIAL_FIELDS = [
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "twitter_url", label: "Twitter" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "website_url", label: "Website" },
] as const

type ElementRowProps = {
  icon: React.ReactNode
  label: string
  value?: string
  selected: boolean
  onClick: () => void
}

// One full-width, clearly-labeled row per selectable brand asset - a plain
// checklist reads a lot clearer here than small icon-only chips did.
const ElementRow = ({ icon, label, value, selected, onClick }: ElementRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-x-3 p-2 rounded-lg border w-full text-left transition-colors ${
      selected
        ? "border-black bg-black/[0.04]"
        : "border-black/10 hover:border-black/20"
    }`}
  >
    <span className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-black/10 bg-white overflow-hidden">
      {icon}
    </span>
    <span className="flex flex-col min-w-0 flex-1">
      <span className="text-sm text-black truncate">{label}</span>
      {value && value !== label && (
        <span className="text-xs text-black/50 truncate">{value}</span>
      )}
    </span>
    <span
      className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
        selected ? "bg-black border-black text-white" : "border-black/20"
      }`}
    >
      {selected && <CheckMini />}
    </span>
  </button>
)

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
  // Only the id, not the Brand object itself - LogoUpload's router.refresh()
  // after a successful upload re-fetches `brands` from the server, and
  // deriving editingBrand from that fresh prop on every render (instead of
  // snapshotting it once in state) is what makes the logo preview below
  // actually pick up the new logo_url. A separate `editingBrand` state
  // would go stale the moment router.refresh() lands, since nothing here
  // would ever re-sync it - the customer would see "Yükleniyor..." finish
  // with no visible preview, looking like the upload silently failed.
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const editingBrand = editingBrandId
    ? brands.find((b) => b.id === editingBrandId) ?? null
    : null
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
    setEditingBrandId(null)
    setMode("form")
  }

  const openEdit = (brand: Brand) => {
    setEditingBrandId(brand.id)
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
          Kullanmak istediğiniz öğelere tıklayın, aşağıdaki AI alanına
          eklensin.
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

                <div className="flex flex-col gap-y-1.5">
                  {brand.logo_url && (
                    <ElementRow
                      icon={
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={brand.logo_url}
                          alt="Logo"
                          className="h-full w-full object-contain"
                        />
                      }
                      label="Logo"
                      // Every click adds a fresh, uniquely-id'd instance
                      // (see designer-shell's toggleElement) - "selected"
                      // here just means "at least one is already on the
                      // canvas," a prefix match rather than an exact one.
                      selected={Array.from(selectedElementIds).some((id) =>
                        id.startsWith(`logo-${brand.id}-`)
                      )}
                      onClick={() =>
                        onToggleElement({
                          id: `logo-${brand.id}`,
                          type: "logo",
                          label: "Logo",
                          value: brand.logo_url!,
                        })
                      }
                    />
                  )}
                  {brand.alternate_logo_urls?.map((url, i) => (
                    <ElementRow
                      key={url}
                      icon={
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      }
                      label={`Alternatif logo ${i + 1}`}
                      selected={selectedElementIds.has(
                        `alt-logo-${brand.id}-${url}`
                      )}
                      onClick={() =>
                        onToggleElement({
                          id: `alt-logo-${brand.id}-${url}`,
                          type: "logo",
                          label: `Alternatif logo ${i + 1}`,
                          value: url,
                        })
                      }
                    />
                  ))}
                  {brand.colors?.map((color) => (
                    <ElementRow
                      key={color}
                      icon={
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      }
                      label="Renk"
                      value={color}
                      selected={selectedElementIds.has(
                        `color-${brand.id}-${color}`
                      )}
                      onClick={() =>
                        onToggleElement({
                          id: `color-${brand.id}-${color}`,
                          type: "color",
                          label: color,
                          value: color,
                        })
                      }
                    />
                  ))}
                  {brand.heading_font && (
                    <ElementRow
                      icon={
                        <span style={{ fontFamily: brand.heading_font }}>
                          Aa
                        </span>
                      }
                      label="Başlık yazı tipi"
                      value={brand.heading_font}
                      selected={selectedElementIds.has(
                        `font-heading-${brand.id}`
                      )}
                      onClick={() =>
                        onToggleElement({
                          id: `font-heading-${brand.id}`,
                          type: "font",
                          label: brand.heading_font!,
                          value: brand.heading_font!,
                        })
                      }
                    />
                  )}
                  {brand.body_font && (
                    <ElementRow
                      icon={
                        <span style={{ fontFamily: brand.body_font }}>Aa</span>
                      }
                      label="Gövde yazı tipi"
                      value={brand.body_font}
                      selected={selectedElementIds.has(`font-body-${brand.id}`)}
                      onClick={() =>
                        onToggleElement({
                          id: `font-body-${brand.id}`,
                          type: "font",
                          label: brand.body_font!,
                          value: brand.body_font!,
                        })
                      }
                    />
                  )}
                  {brand.slogan && (
                    <ElementRow
                      icon={<TextIcon />}
                      label="Slogan"
                      value={brand.slogan}
                      selected={selectedElementIds.has(`slogan-${brand.id}`)}
                      onClick={() =>
                        onToggleElement({
                          id: `slogan-${brand.id}`,
                          type: "text",
                          label: brand.slogan!,
                          value: brand.slogan!,
                        })
                      }
                    />
                  )}
                  {SOCIAL_FIELDS.map(({ key, label }) => {
                    const url = brand[key]
                    if (!url) return null
                    return (
                      <ElementRow
                        key={key}
                        icon={<LinkIcon />}
                        label={label}
                        value={url}
                        selected={selectedElementIds.has(`${key}-${brand.id}`)}
                        onClick={() =>
                          onToggleElement({
                            id: `${key}-${brand.id}`,
                            type: "social",
                            label: `${label}: ${url}`,
                            value: url,
                          })
                        }
                      />
                    )
                  })}
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
