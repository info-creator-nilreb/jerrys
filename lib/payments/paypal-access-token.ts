import { isPayPalConfigured, paypalApiBaseUrl } from "@/lib/payments/paypal-config";

let cached: { token: string; expiresAtMs: number } | null = null;

/**
 * Client-Credentials-Token (cached bis kurz vor Ablauf).
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new Error("PayPal ist nicht konfiguriert (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).");
  }
  const now = Date.now();
  if (cached && now < cached.expiresAtMs - 60_000) {
    return cached.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const res = await fetch(`${paypalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth fehlgeschlagen (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token || typeof data.expires_in !== "number") {
    throw new Error("PayPal OAuth: unerwartete Antwort.");
  }

  cached = {
    token: data.access_token,
    expiresAtMs: now + data.expires_in * 1000,
  };
  return data.access_token;
}
