import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

// Replaces the old account sidebar: every account-related page links back
// to the Hesabım overview, whose tiles are the navigation.
const BackToAccount = () => (
  <LocalizedClientLink
    href="/account"
    className="mb-6 inline-flex items-center gap-x-1.5 rounded-full px-3 py-1.5 -ml-3 text-sm font-medium text-black/60 hover:bg-black/[0.04] hover:text-black transition-colors"
    data-testid="back-to-account-link"
  >
    <ChevronDown className="rotate-90" />
    Hesabım
  </LocalizedClientLink>
)

export default BackToAccount
