import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";
import { getPayPalAccessToken } from "@/lib/payments/paypal-access-token";
import { paypalApiBaseUrl } from "@/lib/payments/paypal-config";
import {
  fetchPayPalOrder,
  parseCapturedPayPalOrder,
} from "@/lib/payments/paypal-refunds";

function moneyStringFromGrossCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function requireOrigin(): string {
  const origin = canonicalSiteOrigin().replace(/\/$/, "");
  if (!origin) {
    throw new Error(
      "Keine öffentliche Basis-URL (NEXT_PUBLIC_SITE_URL / AUTH_URL / VERCEL_URL) für PayPal-Checkout.",
    );
  }
  return origin;
}

type PayPalLink = { href?: string; rel?: string; method?: string };
export type PayPalShippingPreference = "NO_SHIPPING" | "GET_FROM_FILE";

function approvalUrlFromCreateResponse(json: { links?: PayPalLink[] }): string | null {
  const links = json.links ?? [];
  const approve = links.find((l) => l.rel === "approve" && l.href);
  return approve?.href ?? null;
}

/**
 * PayPal Order anlegen (Intent CAPTURE), `custom_id` = interne Bestell-ID.
 */
export async function createPayPalCheckoutOrder(params: {
  internalOrderId: string;
  orderNumber: string;
  totalGrossCents: number;
  currency: string;
  shippingPreference?: PayPalShippingPreference;
}): Promise<{ paypalOrderId: string; approvalUrl: string | null }> {
  const origin = requireOrigin();
  const token = await getPayPalAccessToken();
  const currency = params.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    throw new Error("Ungültige Währung für PayPal.");
  }

  const shippingPreference = params.shippingPreference ?? "NO_SHIPPING";
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: params.internalOrderId,
        description: `Bestellung ${params.orderNumber}`,
        amount: {
          currency_code: currency,
          value: moneyStringFromGrossCents(params.totalGrossCents),
        },
      },
    ],
    application_context: {
      brand_name: "jerry's",
      locale: "de-DE",
      landing_page: "NO_PREFERENCE",
      shipping_preference: shippingPreference,
      user_action: "PAY_NOW",
      return_url: `${origin}/checkout/paypal-rueckkehr`,
      cancel_url: `${origin}/checkout/paypal-abbruch`,
    },
  };

  const res = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { id?: string; links?: PayPalLink[]; message?: string };
  if (!res.ok) {
    throw new Error(
      `PayPal Order create fehlgeschlagen (${res.status}): ${json.message ?? JSON.stringify(json).slice(0, 300)}`,
    );
  }
  const paypalOrderId = json.id;
  const approvalUrl = approvalUrlFromCreateResponse(json);
  if (!paypalOrderId) {
    throw new Error("PayPal Order create: keine Order-ID.");
  }
  /** Bei reinem Advanced-Card-Flow kann die Approve-URL fehlen; Karten-Zahlung läuft über Card Fields + Capture. */
  return { paypalOrderId, approvalUrl: approvalUrl ?? null };
}

export async function getPayPalCheckoutOrderDetails(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken();
  return fetchPayPalOrder(paypalOrderId.trim(), accessToken);
}

/**
 * Read-only Snapshot einer PayPal-Checkout-Order (für Reconciliation).
 */
export async function getPayPalCheckoutOrderSnapshot(paypalOrderId: string): Promise<{
  paypalOrderId: string;
  status: string;
  /** Capture bereits durch; Shop kann finalisieren. */
  isCompleted: boolean;
  /** Kunde hat zugestimmt; Capture noch ausstehend oder parallel. */
  isApproved: boolean;
}> {
  const accessToken = await getPayPalAccessToken();
  const json = await fetchPayPalOrder(paypalOrderId.trim(), accessToken);
  const status = (json.status ?? "").toUpperCase();
  return {
    paypalOrderId: json.id ?? paypalOrderId,
    status,
    isCompleted: status === "COMPLETED",
    isApproved: status === "APPROVED",
  };
}

/**
 * Order capturen; liefert interne Order-ID, Capture-ID und Betrag zur serverseitigen Prüfung.
 * Bei bereits captureter Order: GET + Parse (idempotent).
 */
export async function capturePayPalCheckoutOrder(paypalOrderId: string): Promise<{
  paypalOrderId: string;
  internalOrderId: string;
  amountValue: string;
  currencyCode: string;
  captureId: string | null;
}> {
  const accessToken = await getPayPalAccessToken();

  const captureRes = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

  const captureJson = (await captureRes.json()) as {
    id?: string;
    status?: string;
    purchase_units?: Parameters<typeof parseCapturedPayPalOrder>[0]["purchase_units"];
    details?: unknown;
    message?: string;
  };

  if (captureRes.ok) {
    const parsed = parseCapturedPayPalOrder(captureJson);
    if (!parsed) {
      throw new Error("PayPal Capture: Bestellzuordnung oder Betrag fehlt.");
    }
    return parsed;
  }

  // Bereits abgeschlossen / Duplikat-Capture: Order erneut laden
  if (captureRes.status === 422 || captureRes.status === 400) {
    const refreshed = await fetchPayPalOrder(paypalOrderId, accessToken);
    const parsed = parseCapturedPayPalOrder(refreshed);
    if (parsed) return parsed;
  }

  throw new Error(
    `PayPal Capture fehlgeschlagen (${captureRes.status}): ${captureJson.message ?? JSON.stringify(captureJson.details ?? captureJson).slice(0, 300)}`,
  );
}

/**
 * Betrag einer offenen PayPal-Order anpassen (Express: Versand nach Lieferland).
 * Nutzt `purchase_units[0]` bzw. `reference_id=default`.
 */
export async function patchPayPalCheckoutOrderAmount(params: {
  paypalOrderId: string;
  totalGrossCents: number;
  currency: string;
}): Promise<void> {
  const token = await getPayPalAccessToken();
  const currency = params.currency.trim().toUpperCase();
  const value = moneyStringFromGrossCents(params.totalGrossCents);
  const orderId = params.paypalOrderId.trim();

  const existing = await fetchPayPalOrder(orderId, token);
  const referenceId =
    (existing.purchase_units?.[0] as { reference_id?: string } | undefined)?.reference_id ??
    "default";

  const patchBody = [
    {
      op: "replace",
      path: `/purchase_units/@reference_id=='${referenceId}'/amount`,
      value: {
        currency_code: currency,
        value,
      },
    },
  ];

  const res = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal Order patch fehlgeschlagen (${res.status}): ${text.slice(0, 300)}`);
  }
}
