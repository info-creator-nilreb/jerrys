import { getPayPalAccessToken } from "@/lib/payments/paypal-access-token";
import { paypalApiBaseUrl } from "@/lib/payments/paypal-config";

function moneyStringFromGrossCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function centsFromMoneyString(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

type PayPalCapture = {
  id?: string;
  amount?: { currency_code?: string; value?: string };
  status?: string;
};

type PurchaseUnit = {
  custom_id?: string;
  amount?: { currency_code?: string; value?: string };
  shipping?: {
    name?: { full_name?: string };
    address?: {
      address_line_1?: string;
      address_line_2?: string;
      admin_area_2?: string;
      admin_area_1?: string;
      postal_code?: string;
      country_code?: string;
    };
  };
  payments?: {
    captures?: PayPalCapture[];
  };
};

export type PayPalOrderApiResponse = {
  id?: string;
  status?: string;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
    phone?: { phone_number?: { national_number?: string } };
  };
  purchase_units?: PurchaseUnit[];
};

export type ParsedPayPalCapture = {
  paypalOrderId: string;
  internalOrderId: string;
  amountValue: string;
  currencyCode: string;
  captureId: string | null;
};

/**
 * Parst eine COMPLETED PayPal-Checkout-Order (Capture-Response oder GET).
 * Exportiert für Unit-Tests.
 */
export function parseCapturedPayPalOrder(json: PayPalOrderApiResponse): ParsedPayPalCapture | null {
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

  const captureId =
    typeof cap?.id === "string" && cap.id.trim().length > 0 ? cap.id.trim() : null;

  return {
    paypalOrderId,
    internalOrderId,
    amountValue: value,
    currencyCode,
    captureId,
  };
}

export async function fetchPayPalOrder(
  paypalOrderId: string,
  accessToken: string,
): Promise<PayPalOrderApiResponse> {
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
  return (await res.json()) as PayPalOrderApiResponse;
}

/** Capture-ID aus bestehender PayPal-Order laden (Fallback, wenn nicht in metadata). */
export async function resolvePayPalCaptureId(paypalOrderId: string): Promise<string> {
  const accessToken = await getPayPalAccessToken();
  const json = await fetchPayPalOrder(paypalOrderId, accessToken);
  const parsed = parseCapturedPayPalOrder(json);
  if (!parsed?.captureId) {
    throw new Error("PayPal Capture-ID konnte nicht ermittelt werden.");
  }
  return parsed.captureId;
}

export type RefundPayPalCaptureResult = {
  refundId: string;
  status: string;
  amountCents: number;
  currencyCode: string;
};

/**
 * Voll- oder Teilerstattung eines Captures (`POST /v2/payments/captures/{id}/refund`).
 * `PayPal-Request-Id` = Idempotenzschlüssel.
 */
export async function refundPayPalCapture(params: {
  captureId: string;
  amountCents: number;
  currency: string;
  requestId: string;
  note?: string;
}): Promise<RefundPayPalCaptureResult> {
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
    throw new Error("Refund-Betrag muss eine positive Cent-Zahl sein.");
  }
  const currency = params.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    throw new Error("Ungültige Währung für PayPal-Refund.");
  }

  const accessToken = await getPayPalAccessToken();
  const body: {
    amount: { value: string; currency_code: string };
    note_to_payer?: string;
  } = {
    amount: {
      value: moneyStringFromGrossCents(params.amountCents),
      currency_code: currency,
    },
  };
  const note = params.note?.trim();
  if (note) {
    body.note_to_payer = note.slice(0, 255);
  }

  const res = await fetch(
    `${paypalApiBaseUrl()}/v2/payments/captures/${encodeURIComponent(params.captureId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "PayPal-Request-Id": params.requestId.slice(0, 38),
      },
      body: JSON.stringify(body),
    },
  );

  const json = (await res.json()) as {
    id?: string;
    status?: string;
    amount?: { value?: string; currency_code?: string };
    message?: string;
    details?: unknown;
  };

  if (!res.ok) {
    throw new Error(
      `PayPal Refund fehlgeschlagen (${res.status}): ${json.message ?? JSON.stringify(json.details ?? json).slice(0, 300)}`,
    );
  }

  const refundId = json.id;
  if (!refundId) {
    throw new Error("PayPal Refund: keine Refund-ID.");
  }

  const amountValue = json.amount?.value ?? moneyStringFromGrossCents(params.amountCents);
  const amountCents = centsFromMoneyString(amountValue) ?? params.amountCents;
  const currencyCode = (json.amount?.currency_code ?? currency).toUpperCase();

  return {
    refundId,
    status: json.status ?? "COMPLETED",
    amountCents,
    currencyCode,
  };
}

export { moneyStringFromGrossCents, fetchPayPalOrder };
