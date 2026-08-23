import { NextRequest, NextResponse } from "next/server"

// Same-origin relay for design-asset images (uploaded logos, etc.) that
// need to be drawn into a <canvas>/WebGL texture (see the 3D box preview,
// utils/panel-texture.ts) - Medusa's /static file route sends no CORS
// headers at all and isn't configurable to (see medusa-config.ts's own
// comment on backend_url), so any canvas operation touching one of those
// images directly throws a tainted-canvas SecurityError, crossOrigin
// attribute or not. Routing through this same-origin proxy sidesteps the
// problem entirely rather than trying to fix it at the Medusa layer.
const ALLOWED_HOSTS = new Set(
  [process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL, "https://admin.packshop.com.tr"]
    .filter((url): url is string => !!url)
    .map((url) => new URL(url).host)
)

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url")
  if (!targetUrl) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return NextResponse.json({ message: "Invalid url" }, { status: 400 })
  }

  // Without this check, this route is an open SSRF relay - any caller
  // could ask it to fetch an arbitrary internal or external URL.
  if (!ALLOWED_HOSTS.has(parsed.host)) {
    return NextResponse.json({ message: "Host not allowed" }, { status: 403 })
  }

  const upstreamResponse = await fetch(parsed.toString())
  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return NextResponse.json(
      { message: "Upstream fetch failed" },
      { status: upstreamResponse.status || 502 }
    )
  }

  return new NextResponse(upstreamResponse.body, {
    headers: {
      "Content-Type": upstreamResponse.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
