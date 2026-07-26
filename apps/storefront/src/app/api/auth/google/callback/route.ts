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

  // `glogin=1` tells the login page to retry the auth check client-side for a
  // few seconds - the customer record was just created/linked, and the store
  // API can take a moment to recognize the new session on the very next
  // request (confirmed: an immediate check 401s, the same check ~9s later
  // succeeds, no code change needed on that end - just don't show the
  // customer a stale login form while it catches up).
  return NextResponse.redirect(new URL("/account?glogin=1", request.url))
}
