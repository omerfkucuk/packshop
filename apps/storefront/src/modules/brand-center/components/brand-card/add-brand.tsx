"use client"

import { Plus } from "@medusajs/icons"
import { Button, Heading } from "@modules/common/components/ui"
import { useActionState, useEffect, useState } from "react"

import { addBrand } from "@lib/data/brands"
import useToggleState from "@lib/hooks/use-toggle-state"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import ColorListInput from "./color-list-input"

const AddBrand = () => {
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addBrand, {
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

  return (
    <>
      <button
        className="border border-black/10 hover:border-black/20 transition-colors rounded-lg p-5 min-h-[220px] h-full w-full flex flex-col justify-between"
        onClick={open}
        data-testid="add-brand-button"
      >
        <span className="font-semibold text-black">Yeni marka</span>
        <Plus />
      </button>

      <Modal isOpen={state} close={close} data-testid="add-brand-modal">
        <Modal.Title>
          <Heading className="mb-2">Marka ekle</Heading>
        </Modal.Title>
        <form action={formAction}>
          <Modal.Body>
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-2">
                <Input
                  label="Firma unvanı"
                  name="company_name"
                  data-testid="company-name-input"
                />
                <Input
                  label="Firma markası"
                  name="brand_name"
                  required
                  data-testid="brand-name-input"
                />
                <Input label="Slogan" name="slogan" data-testid="slogan-input" />
              </div>

              <ColorListInput />

              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="Başlık yazı tipi"
                  name="heading_font"
                  data-testid="heading-font-input"
                />
                <Input
                  label="Gövde yazı tipi"
                  name="body_font"
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
                  data-testid="instagram-input"
                />
                <Input
                  label="Facebook"
                  name="facebook_url"
                  data-testid="facebook-input"
                />
                <Input
                  label="Twitter"
                  name="twitter_url"
                  data-testid="twitter-input"
                />
                <Input label="TikTok" name="tiktok_url" data-testid="tiktok-input" />
                <Input
                  label="Website"
                  name="website_url"
                  data-testid="website-input"
                />
              </div>
            </div>
            {formState.error && (
              <div
                className="text-rose-500 text-sm py-2"
                data-testid="brand-error"
              >
                {formState.error}
              </div>
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

export default AddBrand
