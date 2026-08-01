import { NextRequest, NextResponse } from "next/server"
import { getAuthHeaders } from "@lib/data/cookies"

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
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/brands/${id}/alternate-logos`,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authHeaders = await getAuthHeaders()

  if (!("authorization" in authHeaders)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  const backendResponse = await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/brands/${id}/alternate-logos`,
    {
      method: "DELETE",
      headers: {
        authorization: authHeaders.authorization,
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  const data = await backendResponse.json()
  return NextResponse.json(data, { status: backendResponse.status })
}
