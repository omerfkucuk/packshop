import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"
import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"
import { verifyGoogleIdToken } from "../../utils/verify-google-id-token"

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
  }

  async authenticate(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const idToken = req.body?.id_token

    if (!idToken) {
      return { success: false, error: "No id_token provided" }
    }

    let payload
    try {
      payload = await verifyGoogleIdToken(idToken, this.config_.clientId)
    } catch (err: any) {
      return {
        success: false,
        error: `Could not verify Google id_token: ${err.message}`,
      }
    }

    if (!payload.email_verified) {
      return {
        success: false,
        error: "Email not verified, cannot proceed with authentication",
      }
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
