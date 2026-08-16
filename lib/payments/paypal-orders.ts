import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";
import { getPayPalAccessToken } from "@/lib/payments/paypal-access-token";
import { paypalApiBaseUrl } from "@/lib/payments/paypal-config";
import {
  fetchPayPalOrder,
  parseCapturedPayPalOrder,
  paypalCaptureIsDeclined,
  paypalCaptureRecordStatus,
  type PayPalOrderApiResponse,
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

export type PayPalSepaAddress = {
  address_line_1: string;
  address_line_2?: string;
  admin_area_2: string;
  postal_code: string;
  country_code: string;
};

export type PayPalCheckoutPaymentSource =
  | { type: "sepa_debit"; name: string; email: string; address: PayPalSepaAddress }
  | { type: "card_vault_on_success"; customerId: string }
  | { type: "vaulted_card"; vaultId: string; customerId: string };

export class PayPalOrderCreateError extends Error {
  readonly userMessage?: string;
  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = "PayPalOrderCreateError";
    this.userMessage = userMessage;
  }
}

function hrefForRel(links: PayPalLink[] | undefined, rel: string): string | null {
  const href = links?.find((l) => l.rel === rel && l.href)?.href?.trim();
  return href || null;
}

export function preferredPayPalRedirectUrl(
  created: { approvalUrl: string | null; payerActionUrl: string | null },
  surface: string,
): string {
  if (surface === "sepa") {
    return created.payerActionUrl?.trim() || created.approvalUrl?.trim() || "";
  }
  return created.approvalUrl?.trim() || created.payerActionUrl?.trim() || "";
}

function returnUrls(origin: string): { return_url: string; cancel_url: string } {
  return {
    return_url: `${origin}/checkout/paypal-rueckkehr`,
    cancel_url: `${origin}/checkout/paypal-abbruch`,
  };
}

function applicationContext(
  origin: string,
  shippingPreference: PayPalShippingPreference,
): Record<string, string> {
  return {
    brand_name: "jerry's",
    locale: "de-DE",
    landing_page: "NO_PREFERENCE",
    shipping_preference: shippingPreference,
    user_action: "PAY_NOW",
    ...returnUrls(origin),
  };
}

function paymentSourceBody(
  source: PayPalCheckoutPaymentSource,
  origin: string,
): Record<string, unknown> {
  if (source.type === "sepa_debit") {
    return {
      sepa_debit: {
        name: source.name,
        email: source.email,
        address: source.address,
        experience_context: {
          brand_name: "jerry's",
          locale: "de-DE",
          ...returnUrls(origin),
        },
      },
    };
  }
  if (source.type === "card_vault_on_success") {
    return {
      card: {
        attributes: {
          customer: { id: source.customerId },
          vault: { store_in_vault: "ON_SUCCESS" },
          verification: { method: "SCA_WHEN_REQUIRED" },
        },
      },
    };
  }
  return {
    card: {
      vault_id: source.vaultId,
      stored_credential: {
        payment_initiator: "CUSTOMER",
        payment_type: "ONE_TIME",
        usage: "SUBSEQUENT",
      },
      attributes: {
        verification: { method: "SCA_WHEN_REQUIRED" },
      },
    },
  };
}

function paypalOrderCreateErrorFromResponse(
  status: number,
  json: { message?: string; details?: Array<{ issue?: string; description?: string }> },
  source: PayPalCheckoutPaymentSource | undefined,
): PayPalOrderCreateError {
  const raw = json.message ?? JSON.stringify(json).slice(0, 300);
  const issue = json.details?.[0]?.issue ?? "";
  if (source?.type === "sepa_debit") {
    return new PayPalOrderCreateError(
      `PayPal Order create fehlgeschlagen (${status}): ${raw}`,
      "SEPA-Lastschrift ist für diesen Shop derzeit nicht verfügbar oder die Angaben wurden nicht akzeptiert. Bitte PayPal oder Karte wählen.",
    );
  }
  if (source?.type === "vaulted_card" || issue.includes("VAULT")) {
    return new PayPalOrderCreateError(
      `PayPal Order create fehlgeschlagen (${status}): ${raw}`,
      "Die gespeicherte Karte konnte nicht belastet werden. Bitte eine neue Karte eingeben oder eine andere Zahlungsart wählen.",
    );
  }
  return new PayPalOrderCreateError(
    `PayPal Order create fehlgeschlagen (${status}): ${raw}`,
  );
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
  paymentSource?: PayPalCheckoutPaymentSource;
}): Promise<{ paypalOrderId: string; approvalUrl: string | null; payerActionUrl: string | null }> {
  const origin = requireOrigin();
  const token = await getPayPalAccessToken();
  const currency = params.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    throw new Error("Ungültige Währung für PayPal.");
  }

  const shippingPreference = params.shippingPreference ?? "NO_SHIPPING";
  const body: Record<string, unknown> = {
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
  };

  if (params.paymentSource) {
    body.payment_source = paymentSourceBody(params.paymentSource, origin);
    if (params.paymentSource.type !== "sepa_debit") {
      body.application_context = applicationContext(origin, shippingPreference);
    }
  } else {
    body.application_context = applicationContext(origin, shippingPreference);
  }

  const res = await fetch(`${paypalApiBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    id?: string;
    links?: PayPalLink[];
    message?: string;
    details?: Array<{ issue?: string; description?: string }>;
  };
  if (!res.ok) {
    throw paypalOrderCreateErrorFromResponse(res.status, json, params.paymentSource);
  }
  const paypalOrderId = json.id;
  if (!paypalOrderId) {
    throw new PayPalOrderCreateError("PayPal Order create: keine Order-ID.");
  }
  /** Bei reinem Advanced-Card-Flow kann die Approve-URL fehlen; Karten-Zahlung läuft über Card Fields + Capture. */
  return {
    paypalOrderId,
    approvalUrl: hrefForRel(json.links, "approve"),
    payerActionUrl: hrefForRel(json.links, "payer-action"),
  };
}

export async function getPayPalCheckoutOrderDetails(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken();
  return fetchPayPalOrder(paypalOrderId.trim(), accessToken);
}

function paypalCaptureParseFailureMessage(json: PayPalOrderApiResponse): string {
  const captureStatus = paypalCaptureRecordStatus(json);
  if (paypalCaptureIsDeclined(json)) {
    return `PayPal Capture abgelehnt (${captureStatus}).`;
  }
  if (captureStatus === "PENDING") {
    return "PayPal Capture noch nicht abgeschlossen (PENDING).";
  }
  const orderStatus = (json.status ?? "").toUpperCase();
  if (orderStatus && orderStatus !== "COMPLETED") {
    return `PayPal Capture nicht abgeschlossen (Order ${orderStatus}).`;
  }
  return "PayPal Capture: Bestellzuordnung, Capture-Status oder Betrag fehlt.";
}

/**
 * Read-only Snapshot einer PayPal-Checkout-Order (für Reconciliation).
 */
export async function getPayPalCheckoutOrderSnapshot(paypalOrderId: string): Promise<{
  paypalOrderId: string;
  status: string;
  /** Capture COMPLETED — Shop darf finalisieren. */
  isCompleted: boolean;
  /** Kunde hat zugestimmt; Capture noch ausstehend oder parallel. */
  isApproved: boolean;
  /** Karte/Instrument abgelehnt — nicht als bezahlt behandeln. */
  isDeclined: boolean;
}> {
  const accessToken = await getPayPalAccessToken();
  const json = await fetchPayPalOrder(paypalOrderId.trim(), accessToken);
  const status = (json.status ?? "").toUpperCase();
  return {
    paypalOrderId: json.id ?? paypalOrderId,
    status,
    isCompleted: parseCapturedPayPalOrder(json) != null,
    isApproved: status === "APPROVED",
    isDeclined: paypalCaptureIsDeclined(json),
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

  const captureJson = (await captureRes.json()) as PayPalOrderApiResponse & {
    details?: unknown;
    message?: string;
  };

  if (captureRes.ok) {
    const parsed = parseCapturedPayPalOrder(captureJson);
    if (!parsed) {
      throw new Error(paypalCaptureParseFailureMessage(captureJson));
    }
    return parsed;
  }

  // Bereits abgeschlossen / Duplikat-Capture: Order erneut laden
  if (captureRes.status === 422 || captureRes.status === 400) {
    const refreshed = await fetchPayPalOrder(paypalOrderId, accessToken);
    const parsed = parseCapturedPayPalOrder(refreshed);
    if (parsed) return parsed;
    if (paypalCaptureIsDeclined(refreshed) || paypalCaptureIsDeclined(captureJson)) {
      throw new Error(paypalCaptureParseFailureMessage(paypalCaptureIsDeclined(refreshed) ? refreshed : captureJson));
    }
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
