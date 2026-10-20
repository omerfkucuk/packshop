// Free/consumer mailbox providers - a business email on one of these tells
// us nothing about the customer's company, so they're rejected. Matched on
// the exact domain after "@", lowercased.
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.com.tr",
  "outlook.com",
  "outlook.com.tr",
  "live.com",
  "msn.com",
  "windowslive.com",
  "yahoo.com",
  "yahoo.com.tr",
  "ymail.com",
  "rocketmail.com",
  "yandex.com",
  "yandex.com.tr",
  "yandex.ru",
  "ya.ru",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "mail.com",
  "mail.ru",
  "zoho.com",
  "tutanota.com",
  "tuta.io",
  "mynet.com",
  "superonline.com",
  "ttmail.com",
  "e-kolay.net",
])

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getEmailDomain(email: string): string {
  return email.split("@").pop()!.trim().toLowerCase()
}

/**
 * Returns a user-facing (Turkish) error message, or null when the address
 * is acceptable as a business email. No trailing period - the storefront's
 * medusaError helper appends one.
 */
export function validateBusinessEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Lütfen geçerli bir e-posta adresi girin"
  }
  if (FREE_EMAIL_DOMAINS.has(getEmailDomain(email))) {
    return "Lütfen Gmail, Hotmail gibi kişisel bir adres yerine şirketinizin alan adına ait bir e-posta girin"
  }
  return null
}
