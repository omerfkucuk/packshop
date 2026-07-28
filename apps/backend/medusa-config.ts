import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// GoogleAuthService throws at bootstrap if clientId/clientSecret/callbackUrl are
// missing, so the provider is only registered once Google credentials are set -
// otherwise the backend would fail to start for anyone who hasn't configured them yet.
const authProviders: Array<{ resolve: string; id: string; options?: Record<string, unknown> }> = [
  { resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" },
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  authProviders.push({
    resolve: "@medusajs/medusa/auth-google",
    id: "google",
    options: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
  })
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: authProviders,
      },
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              // Defaults to http://localhost:9000/static, which only resolves
              // on the server itself - uploaded images were unreachable from
              // any browser. The files themselves persist via a Railway
              // Volume mounted at the provider's default upload dir
              // (<cwd>/static, matched by Dockerfile's WORKDIR), so this only
              // needs to fix the public URL, not the storage path.
              backend_url: `${process.env.MEDUSA_STATIC_BASE_URL || "https://admin.packshop.com.tr"}/static`,
            },
          },
        ],
      },
    },
  ],
})
