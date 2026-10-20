"use client"
import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState, useState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import StepHeading from "../step-heading"
import { SubmitButton } from "../submit-button"

type BillingMode = "saved" | "same" | "other"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const isOpen = searchParams.get("step") === "address"

  // Firma bilgileri (the default billing address) - offered as a one-click
  // billing choice instead of retyping company/tax details every order.
  const savedBilling = customer?.addresses?.find(
    (a) => a.is_default_billing && a.company
  )

  const [billingMode, setBillingMode] = useState<BillingMode>(() => {
    if (cart?.billing_address?.address_1) {
      if (savedBilling && cart.billing_address.company === savedBilling.company) return "saved"
      if (cart.shipping_address && compareAddresses(cart.shipping_address, cart.billing_address))
        return "same"
      return "other"
    }
    return savedBilling ? "saved" : "same"
  })

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  const billingOptions: { mode: BillingMode; title: string; description?: string }[] = [
    ...(savedBilling
      ? [
          {
            mode: "saved" as const,
            title: "Firma bilgilerimle faturalandır",
            description: [
              savedBilling.company,
              savedBilling.metadata?.tax_office || savedBilling.metadata?.tax_number
                ? `${savedBilling.metadata?.tax_office ?? ""} V.D. · ${savedBilling.metadata?.tax_number ?? ""}`
                : null,
              [savedBilling.address_1, savedBilling.city].filter(Boolean).join(", "),
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ]
      : []),
    { mode: "same", title: "Teslimat adresiyle aynı" },
    { mode: "other", title: "Farklı bir fatura adresi gir" },
  ]

  return (
    <div className="bg-white">
      <StepHeading
        number={1}
        title="Teslimat bilgileri"
        done={!isOpen && !!cart?.shipping_address}
        onEdit={!isOpen && cart?.shipping_address ? handleEdit : undefined}
        editTestId="edit-address-button"
      />
      {isOpen ? (
        <form action={formAction} className="pb-8">
          <ShippingAddress customer={customer} cart={cart} />

          <section className="mt-8 flex flex-col gap-y-3">
            <h3 className="text-base font-semibold text-black">Fatura bilgileri</h3>
            <div className="flex flex-col gap-y-2" role="radiogroup">
              {billingOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  role="radio"
                  aria-checked={billingMode === option.mode}
                  onClick={() => setBillingMode(option.mode)}
                  className={clx(
                    "flex items-start gap-x-3 rounded-xl border p-4 text-left transition-colors",
                    billingMode === option.mode
                      ? "border-black bg-black/[0.02]"
                      : "border-black/15 hover:border-black/30"
                  )}
                  data-testid={`billing-mode-${option.mode}`}
                >
                  <span
                    className={clx(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border",
                      billingMode === option.mode ? "border-[5px] border-black" : "border-black/30"
                    )}
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-black">{option.title}</span>
                    {option.description && (
                      <span className="mt-1 whitespace-pre-line text-sm text-black/60">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            {billingMode === "saved" && (
              <a
                href={`/${countryCode}/faturalandirma-merkezi`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-black/60 underline underline-offset-4 hover:text-black"
              >
                Firma bilgilerini düzenle
              </a>
            )}
            {!savedBilling && customer && (
              <p className="text-sm text-black/60">
                Firma bilgilerinizi{" "}
                <a
                  href={`/${countryCode}/faturalandirma-merkezi`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-black"
                >
                  kaydederseniz
                </a>{" "}
                sonraki siparişlerde tek tıkla faturalandırabilirsiniz.
              </p>
            )}
          </section>

          {billingMode === "same" && <input type="hidden" name="same_as_billing" value="on" />}
          {billingMode === "saved" && savedBilling && (
            <>
              {(
                [
                  ["first_name", customer?.first_name || savedBilling.first_name],
                  ["last_name", customer?.last_name || savedBilling.last_name],
                  ["company", savedBilling.company],
                  ["address_1", savedBilling.address_1],
                  ["city", savedBilling.city],
                  ["postal_code", savedBilling.postal_code],
                  ["province", savedBilling.province],
                  ["country_code", savedBilling.country_code],
                  ["phone", customer?.phone || savedBilling.phone],
                  ["metadata.tax_number", savedBilling.metadata?.tax_number],
                  ["metadata.tax_office", savedBilling.metadata?.tax_office],
                ] as [string, unknown][]
              ).map(([key, value]) => (
                <input
                  key={key}
                  type="hidden"
                  name={`billing_address.${key}`}
                  value={(value as string) ?? ""}
                />
              ))}
            </>
          )}
          {billingMode === "other" && (
            <div className="mt-4">
              <BillingAddress cart={cart} customer={customer} />
            </div>
          )}

          <SubmitButton className="mt-8 w-full small:w-auto" data-testid="submit-address-button">
            Kargo seçimine geç
          </SubmitButton>
          <ErrorMessage error={message} data-testid="address-error-message" />
        </form>
      ) : cart?.shipping_address ? (
        <div className="grid grid-cols-1 small:grid-cols-3 gap-6 pb-8 text-sm">
          <div className="flex flex-col" data-testid="shipping-address-summary">
            <span className="mb-1 font-medium text-black">Teslimat adresi</span>
            <span className="text-black/60">
              {cart.shipping_address.first_name} {cart.shipping_address.last_name}
            </span>
            {cart.shipping_address.company && (
              <span className="text-black/60">{cart.shipping_address.company}</span>
            )}
            <span className="text-black/60">{cart.shipping_address.address_1}</span>
            <span className="text-black/60">
              {[cart.shipping_address.postal_code, cart.shipping_address.city]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
          <div className="flex flex-col" data-testid="shipping-contact-summary">
            <span className="mb-1 font-medium text-black">İletişim</span>
            <span className="text-black/60">{cart.email}</span>
            <span className="text-black/60">{cart.shipping_address.phone}</span>
          </div>
          <div className="flex flex-col" data-testid="billing-address-summary">
            <span className="mb-1 font-medium text-black">Fatura</span>
            {cart.billing_address &&
            compareAddresses(cart.shipping_address, cart.billing_address) ? (
              <span className="text-black/60">Teslimat adresiyle aynı</span>
            ) : (
              <>
                {cart.billing_address?.company && (
                  <span className="text-black/60">{cart.billing_address.company}</span>
                )}
                {cart.billing_address?.metadata?.tax_number ? (
                  <span className="text-black/60">
                    {(cart.billing_address.metadata.tax_office as string) ?? ""} V.D. ·{" "}
                    {cart.billing_address.metadata.tax_number as string}
                  </span>
                ) : null}
                <span className="text-black/60">
                  {[cart.billing_address?.address_1, cart.billing_address?.city]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="pb-8">
          <Spinner />
        </div>
      )}
      <div className="h-px w-full bg-black/10" />
    </div>
  )
}

export default Addresses
