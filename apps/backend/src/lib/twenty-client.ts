// Thin wrapper around Twenty CRM's REST API. Twenty's "composite" fields
// (emails, phones, amount, ...) must be sent as nested objects - see
// https://docs.twenty.com/developers/extend - response shapes were verified
// directly against our self-hosted instance: single-record reads/writes
// return `data.person`/`data.company` (GET by id) or
// `data.createPerson`/`data.updatePerson` (POST/PATCH), list reads return
// `data.people`/`data.companies`.
export type TwentyPerson = {
  id: string
  name?: { firstName: string; lastName: string }
  emails?: { primaryEmail: string }
  phones?: { primaryPhoneNumber: string }
  companyId?: string | null
}

export type TwentyCompany = {
  id: string
  name?: string
  [customField: string]: unknown
}

// Twenty's default Company object has no tax fields - these two were added
// manually in Twenty's UI (Settings -> Data Model -> Companies, labeled
// "Vergi Numarası"/"Vergi Dairesi") and their generated API field names
// were confirmed live via /rest/metadata/objects. Overridable via env in
// case the fields are ever recreated with different labels.
const TAX_NUMBER_FIELD = process.env.TWENTY_COMPANY_TAX_NUMBER_FIELD || "vergiNumarasi"
const TAX_OFFICE_FIELD = process.env.TWENTY_COMPANY_TAX_OFFICE_FIELD || "vergiDairesi"
// Same story for Person: the default `emails` field holds the account/login
// email, and a custom EMAILS field labeled "Kurumsal E-posta" (API name
// kurumsalEPosta, confirmed live) holds the company email. Relabeling a
// field in Twenty renames its API name too (it was kisiselEPosta before) -
// set this env var instead of editing code if that happens again.
export const COMPANY_EMAIL_FIELD =
  process.env.TWENTY_PERSON_COMPANY_EMAIL_FIELD || "kurumsalEPosta"
// Custom DATE field "Son Ziyaret" - day only, matching metadata.last_seen_at.
const LAST_VISIT_FIELD = process.env.TWENTY_PERSON_LAST_VISIT_FIELD || "sonZiyaret"

async function twentyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.TWENTY_API_URL
  const apiKey = process.env.TWENTY_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error("TWENTY_API_URL / TWENTY_API_KEY are not configured")
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(
      `Twenty API ${init?.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`
    )
  }

  return res.json() as Promise<T>
}

async function findPersonIdByEmail(email: string): Promise<string | undefined> {
  const result = await twentyFetch<{ data: { people: TwentyPerson[] } }>(
    `/rest/people?${new URLSearchParams({ filter: `emails.primaryEmail[eq]:${email}` })}`
  )
  return result.data.people[0]?.id
}

export async function fetchPerson(id: string): Promise<TwentyPerson | undefined> {
  try {
    const result = await twentyFetch<{ data: { person: TwentyPerson } }>(`/rest/people/${id}`)
    return result.data.person
  } catch {
    return undefined
  }
}

export async function fetchCompany(id: string): Promise<TwentyCompany | undefined> {
  try {
    const result = await twentyFetch<{ data: { company: TwentyCompany } }>(`/rest/companies/${id}`)
    return result.data.company
  } catch {
    return undefined
  }
}

export type UpsertPersonInput = {
  /** The account/login email, for Twenty's main E-posta field. */
  email: string
  /** The company email (metadata.business_email), for the custom field. */
  companyEmail?: string | null
  /** Last site visit as YYYY-MM-DD (customer.metadata.last_seen_at). */
  lastVisit?: string | null
  jobTitle?: string | null
  linkedinUrl?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
}

// Packshop is Turkey-only, and Medusa's phone field is free text with no
// country picker, so raw values arrive as local Turkish formats like
// "05424779734" that Twenty's phone validator rejects outright. Twenty
// does accept a single E.164 string and splits it itself (confirmed live)
// - this covers the common Turkish shapes; anything it still can't parse
// is caught and dropped by upsertPerson below rather than failing the
// whole sync.
function normalizeTurkishPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) return digits
  if (digits.startsWith("0090")) return `+${digits.slice(2)}`
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`
  if (digits.startsWith("0") && digits.length === 11) return `+90${digits.slice(1)}`
  if (digits.length === 10) return `+90${digits}`
  return digits
}

/**
 * Splits a customer's addresses into Twenty's two email fields: the account
 * email goes to the main E-posta field, the company email
 * (metadata.business_email) to COMPANY_EMAIL_FIELD.
 */
export function personEmails(customer: {
  email?: string | null
  metadata?: Record<string, unknown> | null
}): { email: string; companyEmail: string | null } {
  const businessEmail = customer.metadata?.business_email
  return {
    email: customer.email ?? "",
    companyEmail: typeof businessEmail === "string" && businessEmail ? businessEmail : null,
  }
}

/**
 * Creates/updates the person in Twenty. Pass `knownPersonId` (from the
 * `crm-link` module) whenever we already have one, to update by id
 * directly instead of re-searching by email - required so a later email
 * change (by us or by a rep in Twenty) can't break the match. Falls back
 * to an email search only for the very first sync of a customer. Returns
 * the Twenty person id.
 */
export async function upsertPerson(
  input: UpsertPersonInput,
  knownPersonId?: string | null
): Promise<string> {
  // Omit name/phone entirely when not provided, instead of sending blanks -
  // an update must not erase a name/phone a previous sync already set (e.g.
  // order-placed only has the order's email, not the customer's name).
  const buildPayload = (includePhone: boolean) => ({
    emails: { primaryEmail: input.email },
    ...(input.companyEmail
      ? { [COMPANY_EMAIL_FIELD]: { primaryEmail: input.companyEmail } }
      : {}),
    ...(input.lastVisit ? { [LAST_VISIT_FIELD]: input.lastVisit } : {}),
    // Built-in Person fields. Sent whenever known (empty string clears).
    ...(input.jobTitle != null ? { jobTitle: input.jobTitle } : {}),
    ...(input.linkedinUrl != null
      ? { linkedinLink: { primaryLinkUrl: input.linkedinUrl } }
      : {}),
    ...(input.firstName || input.lastName
      ? { name: { firstName: input.firstName ?? "", lastName: input.lastName ?? "" } }
      : {}),
    ...(includePhone && input.phone
      ? { phones: { primaryPhoneNumber: normalizeTurkishPhone(input.phone) } }
      : {}),
  })

  const write = async (path: string, method: "POST" | "PATCH") => {
    try {
      return await twentyFetch<{ data: Record<string, TwentyPerson> }>(path, {
        method,
        body: JSON.stringify(buildPayload(true)),
      })
    } catch (error) {
      // A still-unparseable phone must not sink the whole sync - email and
      // name are the part that actually matters for matching the contact.
      if (input.phone && String(error).includes("INVALID_PHONE_NUMBER")) {
        return await twentyFetch<{ data: Record<string, TwentyPerson> }>(path, {
          method,
          body: JSON.stringify(buildPayload(false)),
        })
      }
      throw error
    }
  }

  const existingId = knownPersonId ?? (await findPersonIdByEmail(input.email))
  if (existingId) {
    await write(`/rest/people/${existingId}`, "PATCH")
    return existingId
  }

  const created = await write("/rest/people", "POST")
  return created.data.createPerson.id
}

export type UpsertCompanyInput = {
  companyId?: string | null
  name: string
  taxNumber?: string | null
  taxOffice?: string | null
}

/**
 * Creates/updates the customer's company in Twenty. Pass `companyId`
 * (from `crm-link`) whenever we already have one. There's no stable
 * search key for companies the way email is for people, so a first sync
 * with no known id always creates - callers must persist the returned id
 * so later syncs update instead of duplicating.
 */
export async function upsertCompany(input: UpsertCompanyInput): Promise<string> {
  const payload = {
    name: input.name,
    ...(input.taxNumber ? { [TAX_NUMBER_FIELD]: input.taxNumber } : {}),
    ...(input.taxOffice ? { [TAX_OFFICE_FIELD]: input.taxOffice } : {}),
  }

  if (input.companyId) {
    await twentyFetch(`/rest/companies/${input.companyId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
    return input.companyId
  }

  const created = await twentyFetch<{ data: { createCompany: TwentyCompany } }>(
    "/rest/companies",
    { method: "POST", body: JSON.stringify(payload) }
  )
  return created.data.createCompany.id
}

export async function linkPersonToCompany(personId: string, companyId: string): Promise<void> {
  await twentyFetch(`/rest/people/${personId}`, {
    method: "PATCH",
    body: JSON.stringify({ companyId }),
  })
}

export type CreateOrderOpportunityInput = {
  displayId: number
  total: number
  currencyCode: string
  pointOfContactId: string
  companyId?: string | null
}

/**
 * Represents a placed Packshop order as a won Opportunity in Twenty,
 * linked to the order's contact (and company, if known). Twenty has no
 * built-in "order" object, so this is the closest default-schema fit
 * without adding a custom object to Twenty's data model.
 */
export async function createOrderOpportunity(input: CreateOrderOpportunityInput): Promise<void> {
  await twentyFetch("/rest/opportunities", {
    method: "POST",
    body: JSON.stringify({
      name: `Packshop Order #${input.displayId}`,
      amount: {
        amountMicros: Math.round(input.total * 1_000_000),
        currencyCode: input.currencyCode.toUpperCase(),
      },
      stage: "CUSTOMER",
      pointOfContactId: input.pointOfContactId,
      ...(input.companyId ? { companyId: input.companyId } : {}),
    }),
  })
}
