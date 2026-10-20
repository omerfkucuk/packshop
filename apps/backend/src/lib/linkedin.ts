/**
 * Accepts "linkedin.com/in/x", "www.linkedin.com/in/x", "https://tr.linkedin.com/in/x/"
 * and returns a canonical "https://www.linkedin.com/..." URL, or null when
 * the value isn't a LinkedIn address.
 */
export function normalizeLinkedinUrl(input: string): string | null {
  const raw = input.trim()
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) {
    return null
  }
  const path = url.pathname.replace(/\/+$/, "")
  if (!path || path === "/") {
    return null
  }
  return `https://www.linkedin.com${path}`
}
