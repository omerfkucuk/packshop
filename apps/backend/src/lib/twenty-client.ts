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
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
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
  const payload = {
    emails: { primaryEmail: input.email },
    ...(input.firstName || input.lastName
      ? { name: { firstName: input.firstName ?? "", lastName: input.lastName ?? "" } }
      : {}),
    ...(input.phone ? { phones: { primaryPhoneNumber: input.phone } } : {}),
  }

  const existingId = knownPersonId ?? (await findPersonIdByEmail(input.email))
  if (existingId) {
    await twentyFetch(`/rest/people/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
    return existingId
  }

  const created = await twentyFetch<{ data: { createPerson: TwentyPerson } }>(
    "/rest/people",
    { method: "POST", body: JSON.stringify(payload) }
  )
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
