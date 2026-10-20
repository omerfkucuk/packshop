import { Buildings, Swatch } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import { HttpTypes } from "@medusajs/types"

import LogoutButton from "./logout-button"
import { TILE_CLASS } from "./tile-class"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
}

// Mirrors the sidebar (which the overview hides) - keep the two in sync.
const SHORTCUTS = [
  { href: "/account/profile", label: "Kişisel bilgiler", icon: <User size={26} />, testId: "profile-link" },
  { href: "/faturalandirma-merkezi", label: "Firma bilgileri", icon: <Buildings className="h-[26px] w-[26px]" />, testId: "billing-center-link" },
  { href: "/marka-merkezi", label: "Marka Merkezi", icon: <Swatch className="h-[26px] w-[26px]" />, testId: "brand-center-link" },
  { href: "/account/addresses", label: "Adreslerim", icon: <MapPin size={26} />, testId: "addresses-link" },
  { href: "/account/orders", label: "Siparişlerim", icon: <Package size={26} />, testId: "orders-link" },
]

const Overview = ({ customer }: OverviewProps) => {
  const suggestions = getSuggestions(customer)
  // Firma bilgileri (Faturalandırma Merkezi) edits the default billing address.
  const companyName = customer?.addresses?.find((addr) => addr.is_default_billing)?.company

  return (
    <div className="max-w-2xl mx-auto" data-testid="overview-page-wrapper">
      <div className="flex flex-col items-center text-center gap-y-1">
        <div className="flex items-center justify-center h-24 w-24 rounded-full bg-black/60 text-white mb-3">
          <User size={44} />
        </div>
        <h1
          className="text-2xl font-bold text-black"
          data-testid="welcome-message"
          data-value={customer?.first_name}
        >
          {customer?.first_name} {customer?.last_name}
        </h1>
        {companyName && (
          <span className="text-base text-black/60" data-testid="customer-company">
            {companyName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 small:grid-cols-3 gap-2 small:gap-3 mt-8">
        {SHORTCUTS.map(({ href, label, icon, testId }) => (
          <LocalizedClientLink
            key={href}
            href={href}
            className={TILE_CLASS}
            data-testid={testId}
          >
            {icon}
            <span>{label}</span>
          </LocalizedClientLink>
        ))}
      </div>

      {suggestions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-black mb-3">Öneriler</h2>
          <div className="flex flex-col gap-y-3">
            {suggestions.map((s) => (
              <div
                key={s.title}
                className="rounded-xl border border-black/15 p-5 small:p-6"
                data-testid="overview-suggestion"
              >
                <h3 className="text-xl font-bold text-black">{s.title}</h3>
                <p className="mt-2 text-base text-black/70">{s.description}</p>
                <LocalizedClientLink
                  href={s.href}
                  className="mt-4 inline-flex items-center rounded-full bg-black/[0.06] px-5 py-2.5 text-sm font-medium text-black hover:bg-black/[0.1] transition-colors"
                >
                  {s.cta}
                </LocalizedClientLink>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kept apart from the tiles so it isn't hit by accident. */}
      <div className="mt-12 pt-6 border-t border-black/10 flex justify-center">
        <LogoutButton />
      </div>
    </div>
  )
}

type Suggestion = { title: string; description: string; cta: string; href: string }

const getSuggestions = (customer: HttpTypes.StoreCustomer | null): Suggestion[] => {
  if (!customer) {
    return []
  }

  const suggestions: Suggestion[] = []

  if (!customer.metadata?.business_email) {
    suggestions.push({
      title: "Şirket e-postanızı ekleyin",
      description:
        "Siparişleriniz ve teklifleriniz hakkında size doğru adresten ulaşabilmemiz için şirketinize ait e-posta adresinizi ekleyin.",
      cta: "Şirket e-postası ekle",
      href: "/account/profile",
    })
  }

  if (!customer.phone) {
    suggestions.push({
      title: "Telefon numaranızı ekleyin",
      description: "Siparişinizle ilgili hızlıca iletişime geçebilmemiz için telefon numaranızı ekleyin.",
      cta: "Telefon ekle",
      href: "/account/profile",
    })
  }

  if (!customer.addresses?.some((addr) => addr.is_default_billing)) {
    suggestions.push({
      title: "Fatura bilgilerinizi tamamlayın",
      description:
        "Şirket adınızı, vergi numaranızı ve vergi dairenizi ekleyerek ödeme adımında zaman kazanın.",
      cta: "Fatura bilgilerini ekle",
      href: "/faturalandirma-merkezi",
    })
  }

  return suggestions
}

export default Overview
