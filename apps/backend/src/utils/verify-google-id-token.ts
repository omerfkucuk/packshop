import { promisify } from "util"
import jwt, { type JwtHeader } from "jsonwebtoken"
import jwksClient from "jwks-rsa"

const verifyJwt = promisify(jwt.verify) as (
  token: string,
  getKey: (header: JwtHeader, callback: (err: Error | null, key?: string) => void) => void,
  options: Record<string, unknown>
) => Promise<Record<string, any> | undefined>

const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]

const jwks = jwksClient({
  jwksUri: GOOGLE_JWKS_URI,
  cache: true,
  rateLimit: true,
})

const getSigningKey = (
  header: JwtHeader,
  callback: (err: Error | null, key?: string) => void
) => {
  if (!header.kid) {
    callback(new Error("ID token is missing 'kid' header"))
    return
  }
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error("Unable to resolve signing key"))
      return
    }
    callback(null, key.getPublicKey())
  })
}

export type VerifiedGoogleIdToken = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
}

// Shared by the `google-one-tap` auth provider and the account-linking route
// below it - both need to independently confirm a Google ID token is
// genuine (signed by Google, for this app, not expired) before trusting any
// claim inside it.
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string
): Promise<VerifiedGoogleIdToken> {
  const payload = await verifyJwt(idToken, getSigningKey, {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: GOOGLE_ISSUERS,
  })

  if (!payload) {
    throw new Error("Invalid id_token")
  }
  if (!payload.sub) {
    throw new Error("id_token is missing 'sub' claim")
  }

  return payload as VerifiedGoogleIdToken
}
