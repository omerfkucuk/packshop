import crypto from "crypto"

// Per https://docs.twenty.com/developers/extend/webhooks: Twenty signs each
// webhook with HMAC-SHA256 over "{timestamp}:{rawBody}", sent as
// X-Twenty-Webhook-Signature, alongside X-Twenty-Webhook-Timestamp.
export function verifyTwentyWebhookSignature(
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined
): boolean {
  const secret = process.env.TWENTY_WEBHOOK_SECRET
  if (!secret || !timestamp || !signature) {
    return false
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest("hex")

  const expectedBuf = Buffer.from(expected, "hex")
  const actualBuf = Buffer.from(signature, "hex")
  if (expectedBuf.length !== actualBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}
