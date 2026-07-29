import { promisify } from "util"
import jwt, { type JwtHeader } from "jsonwebtoken"
import jwksClient, { type JwksClient } from "jwks-rsa"
import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"
import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"

const verifyJwt = promisify(jwt.verify) as (
  token: string,
  getKey: (header: JwtHeader, callback: (err: Error | null, key?: string) => void) => void,
  options: Record<string, unknown>
) => Promise<Record<string, any> | undefined>

const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]

type InjectedDependencies = {
  logger: Logger
}

type Options = {
  clientId: string
}

// Google Identity Services "One Tap" hands the browser an already-signed ID
// token directly - there's no redirect and no authorization code, so this
// provider only needs the verification half of what the stock `auth-google`
// provider does in its OAuth callback (see @medusajs/auth-google's
// GoogleAuthService.verify_): check the token's signature against Google's
// public keys, then find or create the auth identity from its claims.
class GoogleOneTapAuthService extends AbstractAuthModuleProvider {
  static identifier = "google-one-tap"
  static DISPLAY_NAME = "Google One Tap Authentication"

  protected config_: Options
  protected logger_: Logger
  protected jwks_: JwksClient

  static validateOptions(options: Options) {
    if (!options.clientId) {
      throw new Error("Google One Tap clientId is required")
    }
  }

  constructor({ logger }: InjectedDependencies, options: Options) {
    // @ts-ignore
    super(...arguments)
    this.config_ = options
    this.logger_ = logger
    this.jwks_ = jwksClient({
      jwksUri: GOOGLE_JWKS_URI,
      cache: true,
      rateLimit: true,
    })
  }

  private getSigningKey_ = (
    header: JwtHeader,
    callback: (err: Error | null, key?: string) => void
  ) => {
    if (!header.kid) {
      callback(new Error("ID token is missing 'kid' header"))
      return
    }
    this.jwks_.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        callback(err ?? new Error("Unable to resolve signing key"))
        return
      }
      callback(null, key.getPublicKey())
    })
  }

  async authenticate(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const idToken = req.body?.id_token

    if (!idToken) {
      return { success: false, error: "No id_token provided" }
    }

    let payload: Record<string, any> | undefined
    try {
      payload = await verifyJwt(idToken, this.getSigningKey_, {
        algorithms: ["RS256"],
        audience: this.config_.clientId,
        issuer: GOOGLE_ISSUERS,
      })
    } catch (err: any) {
      return {
        success: false,
        error: `Could not verify Google id_token: ${err.message}`,
      }
    }

    if (!payload) {
      return { success: false, error: "Invalid id_token" }
    }
    if (!payload.email_verified) {
      return {
        success: false,
        error: "Email not verified, cannot proceed with authentication",
      }
    }
    if (!payload.sub) {
      return { success: false, error: "id_token is missing 'sub' claim" }
    }

    const entity_id = payload.sub
    const userMetadata = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    }

    let authIdentity
    try {
      authIdentity = await authIdentityService.retrieve({ entity_id })
    } catch (error: any) {
      if (error.type === MedusaError.Types.NOT_FOUND) {
        authIdentity = await authIdentityService.create({
          entity_id,
          user_metadata: userMetadata,
        })
      } else {
        return { success: false, error: error.message }
      }
    }

    return { success: true, authIdentity }
  }
}

export default GoogleOneTapAuthService
