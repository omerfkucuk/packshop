// Google Fonts CSS2 delivery references its actual font files from
// fonts.gstatic.com - fine for a normal in-document <link>, but the 3D box
// preview rasterizes each panel by loading a generated <svg> as a Blob
// <img> (see panel-texture.tsx), and THAT rendering context is isolated
// from the page: it doesn't inherit the page's own loaded <link>
// stylesheets or its document.fonts, the way a live in-DOM <svg> or a
// canvas 2D fillText() call both do. A plain `font-family` reference
// inside that image silently falls back to one generic font regardless of
// what was actually chosen - every panel's text reading as "the same
// font" is exactly that symptom. The fix is to give the SVG its own,
// fully self-contained @font-face - fetched here and rewritten so every
// font file `url(...)` becomes a data: URI, with no external reference
// left for that isolated context to fail to resolve.

const GSTATIC_URL_PATTERN = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g

// Chunked (not a single String.fromCharCode(...allBytes) spread) so a
// large font file's byte count doesn't blow the call stack.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += Array.from(bytes.subarray(i, i + chunkSize), (byte) => String.fromCharCode(byte)).join("")
  }
  return btoa(binary)
}

async function inlineFontFaceUrls(css: string): Promise<string> {
  const urls = Array.from(new Set(Array.from(css.matchAll(GSTATIC_URL_PATTERN), (m) => m[1])))
  if (urls.length === 0) return css

  const dataUrlByOriginal = new Map<string, string>()
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) return
      const buffer = await response.arrayBuffer()
      const format = url.endsWith(".woff2") ? "font/woff2" : "font/woff"
      dataUrlByOriginal.set(url, `data:${format};base64,${arrayBufferToBase64(buffer)}`)
    })
  )

  return css.replace(GSTATIC_URL_PATTERN, (match, url) => {
    const dataUrl = dataUrlByOriginal.get(url)
    return dataUrl ? `url(${dataUrl})` : match
  })
}

// One family/weight's full, self-contained @font-face CSS - every
// unicode-range block Google returns (not just the first/Latin one), so
// Turkish diacritics (ğ, ş, ı, ç, ö, ü and their capitals), which live in
// the separate latin-ext block, still render instead of silently
// tofu-ing or substituting a fallback glyph.
async function fetchEmbeddableFontFace(fontFamily: string, fontWeight: number): Promise<string> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    fontFamily
  )}:wght@${fontWeight}&display=swap`
  try {
    const response = await fetch(cssUrl)
    if (!response.ok) return ""
    return await inlineFontFaceUrls(await response.text())
  } catch {
    return "" // best-effort - one bad font shouldn't block the whole panel's texture
  }
}

// Combined, ready-to-embed @font-face CSS for every font/weight pair a
// panel's text elements actually use - pass the result straight into a
// generated SVG's own <style>. Dedupes identical family/weight pairs
// before fetching (a Map value, not the whole panel's element list, so
// callers already do this naturally - see box-mesh.tsx's fontPairs).
export async function buildEmbeddedFontFaceCss(
  fontPairs: { font: string; weight: number }[]
): Promise<string> {
  const blocks = await Promise.all(
    fontPairs.map((p) => fetchEmbeddableFontFace(p.font, p.weight))
  )
  return blocks.filter(Boolean).join("\n")
}
