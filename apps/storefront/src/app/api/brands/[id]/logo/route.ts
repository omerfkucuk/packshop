import { NextRequest, NextResponse } from "next/server"
import { getAuthHeaders } from "@lib/data/cookies"

// Proxies the multipart upload to the Medusa backend server-side, so the
// `_medusa_jwt` cookie (httpOnly) never has to be readable from the
// client-side upload code - the browser only ever talks to this same-origin
// route, never to the backend directly.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authHeaders = await getAuthHeaders()

  if (!("authorization" in authHeaders)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()

  const backendResponse = await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/brands/${id}/logo`,
    {
      method: "POST",
      headers: {
        authorization: authHeaders.authorization,
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      body: formData,
    }
  )

  const data = await backendResponse.json()
  return NextResponse.json(data, { status: backendResponse.status })
}
