"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash, Link as LinkIcon } from "@medusajs/icons"

import { Brand, deleteBrand, addBrand, updateBrand } from "@lib/data/brands"
import { Heading } from "@modules/common/components/ui"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import ColorListInput from "../brand-card/color-list-input"
import LogoUpload from "../brand-card/logo-upload"

type BrandFormProps = {
  countryCode: string
  brand?: Brand
}

const BrandForm = ({ countryCode, brand }: BrandFormProps) => {
  const router = useRouter()
  const isEdit = !!brand
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [formState, formAction] = useActionState(
    isEdit ? updateBrand : addBrand,
    { success: false, error: null } as { success: boolean; error: string | null }
  )

  const removeBrand = async () => {
    if (!brand) return
    setRemoving(true)
    await deleteBrand(brand.id)
    router.push(`/${countryCode}/marka-merkezi`)
  }

  const copyShareLink = () => {
    if (!brand) return
    const url = `${window.location.origin}/${countryCode}/marka-merkezi/paylas/${brand.share_id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-y-8">
      <div className="flex flex-col gap-y-2">
        <LocalizedClientLink
          href="/marka-merkezi"
          className="text-sm text-black/50 hover:text-black transition-colors w-fit"
        >
          ← Marka Merkezi
        </LocalizedClientLink>
        <div className="flex items-center justify-between">
          <Heading className="text-2xl font-bold tracking-tight text-black">
            {isEdit ? "Markayı düzenle" : "Yeni marka oluştur"}
          </Heading>
          {isEdit && (
            <div className="flex items-center gap-x-4">
              <button
                type="button"
                className="text-sm text-black flex items-center gap-x-2"
                onClick={copyShareLink}
                data-testid="brand-share-button"
              >
                <LinkIcon />
                {copied ? "Kopyalandı" : "Paylaş"}
              </button>
              <button
                type="button"
                className="text-sm text-black flex items-center gap-x-2"
                onClick={removeBrand}
                data-testid="brand-delete-button"
              >
                {removing ? <Spinner /> : <Trash />}
                Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {isEdit && (
        <div className="flex flex-col gap-y-4">
          <LogoUpload brandId={brand.id} currentUrl={brand.logo_url} label="Firma logosu" />
          <LogoUpload
            brandId={brand.id}
            currentUrl={null}
            label="Alternatif logolar"
            multiple
          />
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-y-6">
        <input type="hidden" name="countryCode" value={countryCode} />
        {isEdit && <input type="hidden" name="brandId" value={brand.id} />}

        <div className="flex flex-col gap-y-2">
          <Input
            label="Firma unvanı"
            name="company_name"
            defaultValue={brand?.company_name || undefined}
            data-testid="company-name-input"
          />
          <Input
            label="Firma markası"
            name="brand_name"
            required
            defaultValue={brand?.brand_name}
            data-testid="brand-name-input"
          />
          <Input
            label="Slogan"
            name="slogan"
            defaultValue={brand?.slogan || undefined}
            data-testid="slogan-input"
          />
        </div>

        <ColorListInput defaultColors={brand?.colors || []} />

        <div className="grid grid-cols-2 gap-x-2">
          <Input
            label="Başlık yazı tipi"
            name="heading_font"
            defaultValue={brand?.heading_font || undefined}
            data-testid="heading-font-input"
          />
          <Input
            label="Gövde yazı tipi"
            name="body_font"
            defaultValue={brand?.body_font || undefined}
            data-testid="body-font-input"
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <span className="text-sm font-semibold text-black">Sosyal medya</span>
          <Input
            label="Instagram"
            name="instagram_url"
            defaultValue={brand?.instagram_url || undefined}
            data-testid="instagram-input"
          />
          <Input
            label="Facebook"
            name="facebook_url"
            defaultValue={brand?.facebook_url || undefined}
            data-testid="facebook-input"
          />
          <Input
            label="Twitter"
            name="twitter_url"
            defaultValue={brand?.twitter_url || undefined}
            data-testid="twitter-input"
          />
          <Input
            label="TikTok"
            name="tiktok_url"
            defaultValue={brand?.tiktok_url || undefined}
            data-testid="tiktok-input"
          />
          <Input
            label="Website"
            name="website_url"
            defaultValue={brand?.website_url || undefined}
            data-testid="website-input"
          />
        </div>

        {formState.error && (
          <div className="text-rose-500 text-sm" data-testid="brand-error">
            {formState.error}
          </div>
        )}

        <div className="flex gap-3">
          <LocalizedClientLink
            href="/marka-merkezi"
            className="inline-flex items-center justify-center h-10 px-4 rounded-md font-medium bg-white text-black border border-gray-200 hover:bg-gray-50 transition-colors"
            data-testid="cancel-button"
          >
            Vazgeç
          </LocalizedClientLink>
          <SubmitButton data-testid="save-button">Kaydet</SubmitButton>
        </div>
      </form>
    </div>
  )
}

export default BrandForm
