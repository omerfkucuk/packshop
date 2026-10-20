import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

import LogoutButton from "./logout-button"
import { TILE_CLASS } from "./tile-class"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

// Mirrors the sidebar (which the overview hides) - keep the two in sync.
const SHORTCUTS = [
  { href: "/account/profile", label: "Profilim", Icon: User, testId: "profile-link" },
  { href: "/account/addresses", label: "Adreslerim", Icon: MapPin, testId: "addresses-link" },
  { href: "/account/orders", label: "Siparişlerim", Icon: Package, testId: "orders-link" },
]

const Overview = ({ customer, orders }: OverviewProps) => {
  const suggestions = getSuggestions(customer)

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
        <span
          className="text-base text-black/60"
          data-testid="customer-email"
          data-value={customer?.email}
        >
          {customer?.email}
        </span>
      </div>

      <div className="grid grid-cols-2 small:grid-cols-4 gap-2 small:gap-3 mt-8">
        {SHORTCUTS.map(({ href, label, Icon, testId }) => (
          <LocalizedClientLink
            key={href}
            href={href}
            className={TILE_CLASS}
            data-testid={testId}
          >
            <Icon size={26} />
            <span>{label}</span>
          </LocalizedClientLink>
        ))}
        <LogoutButton />
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

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-black">Son siparişler</h2>
          {orders && orders.length > 0 && (
            <LocalizedClientLink
              href="/account/orders"
              className="text-sm text-black/60 hover:text-black"
            >
              Tümünü gör
            </LocalizedClientLink>
          )}
        </div>
        <ul className="flex flex-col gap-y-3" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 3).map((order) => (
              <li key={order.id} data-testid="order-wrapper" data-value={order.id}>
                <LocalizedClientLink
                  href={`/account/orders/details/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-black/10 p-4 hover:border-black/20 transition-colors"
                >
                  <div className="flex flex-col gap-y-0.5 text-sm">
                    <span
                      className="font-semibold text-black"
                      data-testid="order-id"
                      data-value={order.display_id}
                    >
                      #{order.display_id}
                    </span>
                    <span className="text-black/60" data-testid="order-created-date">
                      {new Date(order.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-x-3">
                    <span className="text-sm font-medium text-black" data-testid="order-amount">
                      {convertToLocale({
                        amount: order.total,
                        currency_code: order.currency_code,
                      })}
                    </span>
                    <ChevronDown className="-rotate-90 text-black/40" />
                  </div>
                </LocalizedClientLink>
              </li>
            ))
          ) : (
            <span className="text-black/50" data-testid="no-orders-message">
              Henüz sipariş yok
            </span>
          )}
        </ul>
      </section>
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
