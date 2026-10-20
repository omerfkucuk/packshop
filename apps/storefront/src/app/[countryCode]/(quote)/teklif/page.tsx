import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PrintButton from "@modules/cart/components/print-button"

export const metadata: Metadata = {
  title: "Fiyat teklifi | Packshop",
  robots: { index: false },
}

const VALID_DAYS = 15

export default async function QuotePage() {
  const cart = await retrieveCart().catch(() => null)
  if (!cart?.items?.length) {
    notFound()
  }
  const customer = await retrieveCustomer().catch(() => null)
  const billing = customer?.addresses?.find((a) => a.is_default_billing)

  const today = new Date()
  const validUntil = new Date(today)
  validUntil.setDate(validUntil.getDate() + VALID_DAYS)
  const fmtDate = (d: Date) => d.toLocaleDateString("tr-TR")
  const money = (amount?: number | null) =>
    convertToLocale({ amount: amount ?? 0, currency_code: cart.currency_code })
  const quoteNo = `TKL-${cart.id.slice(-8).toUpperCase()}`

  const customerLines = [
    billing?.company,
    billing?.metadata?.tax_office || billing?.metadata?.tax_number
      ? `${billing?.metadata?.tax_office ?? ""} V.D. · ${billing?.metadata?.tax_number ?? ""}`
      : null,
    [billing?.address_1, billing?.city].filter(Boolean).join(", ") || null,
    customer ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() : null,
    (customer?.metadata?.business_email as string | undefined) || customer?.email,
    customer?.phone,
  ].filter(Boolean) as string[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <LocalizedClientLink href="/cart" className="text-sm text-black/60 hover:text-black">
          ← Sepete dön
        </LocalizedClientLink>
        <PrintButton />
      </div>

      <div className="rounded-xl bg-white p-8 small:p-12 shadow-sm print:shadow-none print:rounded-none print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-8">
          <div>
            <div className="text-2xl font-bold uppercase tracking-tight">Packshop</div>
            <div className="mt-1 text-sm text-black/60">packshop.com.tr</div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-black">Fiyat teklifi</h1>
            <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm">
              <dt className="text-black/60">Teklif no</dt>
              <dd className="font-medium">{quoteNo}</dd>
              <dt className="text-black/60">Tarih</dt>
              <dd>{fmtDate(today)}</dd>
              <dt className="text-black/60">Geçerlilik</dt>
              <dd>{fmtDate(validUntil)}</dd>
            </dl>
          </div>
        </div>

        <div className="py-8 border-b border-black/10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-black/50">Müşteri</h2>
          {customerLines.length > 0 ? (
            <div className="mt-2 flex flex-col text-sm text-black">
              {customerLines.map((line, i) => (
                <span key={i} className={i === 0 ? "font-semibold text-base" : ""}>
                  {line}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-black/60">
              Firma bilgilerinin teklifte yer alması için giriş yapıp Firma bilgileri sayfasını doldurun.
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-black/50">
                <th className="py-3 pr-4 font-medium">Ürün</th>
                <th className="py-3 px-4 font-medium text-right">Adet</th>
                <th className="py-3 px-4 font-medium text-right">Birim fiyat</th>
                <th className="py-3 pl-4 font-medium text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {cart.items!.map((item) => {
                const options =
                  item.variant?.options
                    ?.filter((o) => o.option?.title && o.value)
                    .map((o) => `${o.option!.title}: ${o.value}`) ?? []
                return (
                  <tr key={item.id} className="border-b border-black/5 align-top">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-black">{item.product_title}</div>
                      <div className="text-black/60">
                        {options.length ? options.join(" · ") : item.variant_title}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">{item.quantity}</td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">{money(item.unit_price)}</td>
                    <td className="py-4 pl-4 text-right whitespace-nowrap font-medium">{money(item.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto w-full max-w-xs text-sm">
          {[
            ["Ara toplam", money(cart.item_subtotal)],
            ["Kargo", money(cart.shipping_subtotal)],
            ...(cart.discount_total ? [["İndirim", `- ${money(cart.discount_total)}`]] : []),
            ["KDV", money(cart.tax_total)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1 text-black/70">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-base font-bold text-black">
            <span>Toplam</span>
            <span>{money(cart.total)}</span>
          </div>
        </div>

        <p className="mt-10 text-xs text-black/50">
          Bu teklif {fmtDate(validUntil)} tarihine kadar geçerlidir. Fiyatlar sipariş anındaki stok ve
          kur koşullarına göre değişebilir. Özel ölçülü ürünlerde nihai fiyat ekibimiz tarafından teyit edilir.
        </p>
      </div>
    </div>
  )
}
