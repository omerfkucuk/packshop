import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Medusa Store account.",
}

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <LoginTemplate
      googleError={
        error === "google_auth_failed"
          ? "Something went wrong signing in with Google. Please try again."
          : undefined
      }
    />
  )
}
