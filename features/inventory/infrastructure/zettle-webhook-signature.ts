import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifiziert Zettle Pusher-Signatur:
 * HMAC-SHA256(signingKey, `${timestamp}.${payload}`) vs Header `X-iZettle-Signature`.
 * `timestamp` und `payload` kommen aus dem Event-JSON (nicht aus HTTP-Headern).
 */
export function verifyZettleWebhookSignature(input: {
  signingKey: string;
  timestamp: string;
  payload: string;
  signatureHeader: string | null | undefined;
}): boolean {
  const sig = input.signatureHeader?.trim();
  if (!sig || !input.timestamp || input.payload == null) return false;
  const expected = createHmac("sha256", input.signingKey)
    .update(`${input.timestamp}.${input.payload}`, "utf8")
    .digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
