import { isPayPalConfigured, paypalApiBaseUrl } from "@/lib/payments/paypal-config";

/**
 * ID-Token für Card Fields (`data-user-id-token`), damit PayPal hinterlegte
 * Händler-Karten des Kunden anzeigen kann.
 *
 * Eigenes OAuth (nicht den gecachten Access-Token-Grant mischen).
 */
export async function getPayPalUserIdToken(targetCustomerId: string): Promise<string | null> {
  if (!isPayPalConfigured()) return null;
  const id = targetCustomerId.trim();
  if (!id) return null;

  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    response_type: "id_token",
    target_customer_id: id,
  });

  const res = await fetch(`${paypalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { id_token?: unknown };
  return typeof json.id_token === "string" && json.id_token.trim() ? json.id_token.trim() : null;
}
