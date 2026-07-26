import { completeGoogleLogin } from "@lib/data/customer"
import { NextRequest, NextResponse } from "next/server"

// Fixed, non-locale-prefixed callback URL registered with Google (the country
// code isn't known at this point, and Google requires one exact redirect URI).
// The Next.js middleware already excludes `/api/*` from its locale-prefix
// redirect, so this route is reachable as-is.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/account?error=google_auth_failed", request.url)
    )
  }

  const result = await completeGoogleLogin(code, state)

  if (!result.success) {
    return NextResponse.redirect(
      new URL("/account?error=google_auth_failed", request.url)
    )
  }

  return NextResponse.redirect(new URL("/account", request.url))
}
