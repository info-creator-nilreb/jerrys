import "server-only";

import { getPayPalAccessToken } from "@/lib/payments/paypal-access-token";
import { isPayPalConfigured, paypalApiBaseUrl } from "@/lib/payments/paypal-config";

export type PayPalWebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
};

export function readPayPalWebhookHeaders(headers: Headers): PayPalWebhookHeaders | null {
  const transmissionId = headers.get("paypal-transmission-id")?.trim() ?? "";
  const transmissionTime = headers.get("paypal-transmission-time")?.trim() ?? "";
  const transmissionSig = headers.get("paypal-transmission-sig")?.trim() ?? "";
  const certUrl = headers.get("paypal-cert-url")?.trim() ?? "";
  const authAlgo = headers.get("paypal-auth-algo")?.trim() ?? "";
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return null;
  }
  return { transmissionId, transmissionTime, transmissionSig, certUrl, authAlgo };
}

export function paypalWebhookIdConfigured(): string | null {
  const id = process.env.PAYPAL_WEBHOOK_ID?.trim();
  return id || null;
}

/**
 * Postback-Verifikation über PayPal `verify-webhook-signature`.
 * `webhookEvent` muss das geparste Event-Objekt sein (wie von PayPal gesendet).
 */
export async function verifyPayPalWebhookSignature(params: {
  headers: PayPalWebhookHeaders;
  webhookEvent: unknown;
}): Promise<boolean> {
  if (!isPayPalConfigured()) return false;
  const webhookId = paypalWebhookIdConfigured();
  if (!webhookId) return false;

  const token = await getPayPalAccessToken();
  const res = await fetch(`${paypalApiBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: params.headers.transmissionId,
      transmission_time: params.headers.transmissionTime,
      cert_url: params.headers.certUrl,
      auth_algo: params.headers.authAlgo,
      transmission_sig: params.headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: params.webhookEvent,
    }),
  });

  if (!res.ok) return false;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === "SUCCESS";
}

/** Extrahiert PayPal Order ID aus typischen Capture-/Order-Events. */
export function extractPayPalOrderIdFromWebhookEvent(event: {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    // CHECKOUT.ORDER.* trägt oft die Order-ID als resource.id
  };
}): string | null {
  const related = event.resource?.supplementary_data?.related_ids?.order_id?.trim();
  if (related) return related;
  if (
    event.event_type === "CHECKOUT.ORDER.APPROVED" ||
    event.event_type === "CHECKOUT.ORDER.COMPLETED"
  ) {
    const id = event.resource?.id?.trim();
    if (id) return id;
  }
  return null;
}
