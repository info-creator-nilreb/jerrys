import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";
import { getPayPalAccessToken } from "@/lib/payments/paypal-access-token";
import { paypalApiBaseUrl } from "@/lib/payments/paypal-config";

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
}): Promise<{ paypalOrderId: string; approvalUrl: string | null }> {
  const origin = requireOrigin();
  const token = await getPayPalAccessToken();
  const currency = params.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    throw new Error("Ungültige Währung für PayPal.");
  }

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
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: `${origin}/checkout/paypal-rueckkehr`,
      cancel_url: `${origin}/checkout`,
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

type PurchaseUnit = {
  custom_id?: string;
  amount?: { currency_code?: string; value?: string };
  payments?: {
    captures?: Array<{ amount?: { currency_code?: string; value?: string } }>;
  };
};

function parseCapturedOrder(json: {
  id?: string;
  status?: string;
  purchase_units?: PurchaseUnit[];
}): { paypalOrderId: string; internalOrderId: string; amountValue: string; currencyCode: string } | null {
  const paypalOrderId = json.id;
  const pu = json.purchase_units?.[0];
  if (!paypalOrderId || !pu) return null;

  const internalOrderId =
    typeof pu.custom_id === "string" && pu.custom_id.length > 0 ? pu.custom_id : null;
  if (!internalOrderId) return null;

  const cap = pu.payments?.captures?.[0];
  const amount = cap?.amount ?? pu.amount;
  const value = amount?.value;
  const currencyCode = amount?.currency_code;
  if (!value || !currencyCode) return null;

  if (json.status !== "COMPLETED") return null;

  return { paypalOrderId, internalOrderId, amountValue: value, currencyCode };
}

async function fetchPayPalOrder(paypalOrderId: string, accessToken: string) {
  const res = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders/${paypalOrderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal Order GET fehlgeschlagen (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as {
    id?: string;
    status?: string;
    purchase_units?: PurchaseUnit[];
  };
}

/**
 * Order capturen; liefert interne Order-ID und Betrag zur serverseitigen Prüfung.
 * Bei bereits captureter Order: GET + Parse (idempotent).
 */
export async function capturePayPalCheckoutOrder(paypalOrderId: string): Promise<{
  paypalOrderId: string;
  internalOrderId: string;
  amountValue: string;
  currencyCode: string;
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
    purchase_units?: PurchaseUnit[];
    details?: unknown;
    message?: string;
  };

  if (captureRes.ok) {
    const parsed = parseCapturedOrder(captureJson);
    if (!parsed) {
      throw new Error("PayPal Capture: Bestellzuordnung oder Betrag fehlt.");
    }
    return parsed;
  }

  // Bereits abgeschlossen / Duplikat-Capture: Order erneut laden
  if (captureRes.status === 422 || captureRes.status === 400) {
    const refreshed = await fetchPayPalOrder(paypalOrderId, accessToken);
    const parsed = parseCapturedOrder(refreshed);
    if (parsed) return parsed;
  }

  throw new Error(
    `PayPal Capture fehlgeschlagen (${captureRes.status}): ${captureJson.message ?? JSON.stringify(captureJson.details ?? captureJson).slice(0, 300)}`,
  );
}
