"use client"

import { useActionState, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { PencilSquare as Edit, Trash, Link as LinkIcon } from "@medusajs/icons"

import { Brand, deleteBrand, updateBrand } from "@lib/data/brands"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Button, Heading } from "@modules/common/components/ui"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import Spinner from "@modules/common/icons/spinner"
import ColorListInput from "./color-list-input"
import LogoUpload from "./logo-upload"

type EditBrandProps = {
  brand: Brand
}

const EditBrand = ({ brand }: EditBrandProps) => {
  const { countryCode } = useParams() as { countryCode: string }
  const [removing, setRemoving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateBrand, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  const removeBrand = async () => {
    setRemoving(true)
    await deleteBrand(brand.id)
    setRemoving(false)
  }

  const copyShareLink = () => {
    const url = `${window.location.origin}/${countryCode}/marka-merkezi/paylas/${brand.share_id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div
        className="border border-black/10 rounded-lg p-5 h-full w-full flex flex-col gap-y-4"
        data-testid="brand-container"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <Heading className="text-left font-semibold text-black" data-testid="brand-name">
              {brand.brand_name}
            </Heading>
            {brand.company_name && (
              <span className="text-sm text-black/50">{brand.company_name}</span>
            )}
          </div>
          {brand.logo_url && (
            <div className="h-14 w-14 border border-black/10 rounded-lg bg-black/[0.02] flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.logo_url}
                alt={brand.brand_name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </div>

        <LogoUpload brandId={brand.id} currentUrl={null} label="Logo" />
        <LogoUpload
          brandId={brand.id}
          currentUrl={null}
          label="Alternatif logolar"
          multiple
        />

        <div className="flex items-center gap-x-4 mt-auto pt-2">
          <button
            className="text-sm text-black flex items-center gap-x-2"
            onClick={open}
            data-testid="brand-edit-button"
          >
            <Edit />
            Düzenle
          </button>
          <button
            className="text-sm text-black flex items-center gap-x-2"
            onClick={removeBrand}
            data-testid="brand-delete-button"
          >
            {removing ? <Spinner /> : <Trash />}
            Sil
          </button>
          <button
            className="text-sm text-black flex items-center gap-x-2"
            onClick={copyShareLink}
            data-testid="brand-share-button"
          >
            <LinkIcon />
            {copied ? "Kopyalandı" : "Paylaş"}
          </button>
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-brand-modal">
        <Modal.Title>
          <Heading className="mb-2">Markayı düzenle</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="brandId" value={brand.id} />
          <Modal.Body>
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Input
                  label="Firma unvanı"
                  name="company_name"
                  defaultValue={brand.company_name || undefined}
                  data-testid="company-name-input"
                />
                <Input
                  label="Firma markası"
                  name="brand_name"
                  required
                  defaultValue={brand.brand_name}
                  data-testid="brand-name-input"
                />
                <Input
                  label="Slogan"
                  name="slogan"
                  defaultValue={brand.slogan || undefined}
                  data-testid="slogan-input"
                />
              </div>

              <ColorListInput defaultColors={brand.colors || []} />

              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="Başlık yazı tipi"
                  name="heading_font"
                  defaultValue={brand.heading_font || undefined}
                  data-testid="heading-font-input"
                />
                <Input
                  label="Gövde yazı tipi"
                  name="body_font"
                  defaultValue={brand.body_font || undefined}
                  data-testid="body-font-input"
                />
              </div>

              <div className="flex flex-col gap-y-2">
                <span className="text-sm font-semibold text-black">
                  Sosyal medya
                </span>
                <Input
                  label="Instagram"
                  name="instagram_url"
                  defaultValue={brand.instagram_url || undefined}
                  data-testid="instagram-input"
                />
                <Input
                  label="Facebook"
                  name="facebook_url"
                  defaultValue={brand.facebook_url || undefined}
                  data-testid="facebook-input"
                />
                <Input
                  label="Twitter"
                  name="twitter_url"
                  defaultValue={brand.twitter_url || undefined}
                  data-testid="twitter-input"
                />
                <Input
                  label="TikTok"
                  name="tiktok_url"
                  defaultValue={brand.tiktok_url || undefined}
                  data-testid="tiktok-input"
                />
                <Input
                  label="Website"
                  name="website_url"
                  defaultValue={brand.website_url || undefined}
                  data-testid="website-input"
                />
              </div>
            </div>
            {formState.error && (
              <div className="text-rose-500 text-sm py-2">{formState.error}</div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10"
                data-testid="cancel-button"
              >
                Vazgeç
              </Button>
              <SubmitButton data-testid="save-button">Kaydet</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default EditBrand
