import { NextResponse, type NextRequest } from "next/server";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";

export async function POST(req: NextRequest) {
  const limited = touchPayPalCheckoutApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen." },
      { status: 429, headers: payPalApiRateLimitJsonHeaders(limited.retryAfterSec) },
    );
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { ok: false, error: "PayPal ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const paypalOrderId =
    typeof body === "object" && body !== null && "paypalOrderId" in body
      ? (body as { paypalOrderId: unknown }).paypalOrderId
      : undefined;

  if (typeof paypalOrderId !== "string" || !paypalOrderId.trim()) {
    return NextResponse.json({ ok: false, error: "paypalOrderId fehlt." }, { status: 400 });
  }

  const r = await completePayPalCaptureFlow(paypalOrderId.trim(), {
    eventSource: "paypal_card_fields",
  });

  if (!r.ok) {
    const error =
      r.code === "capture"
        ? "Die Zahlung wurde abgelehnt oder konnte nicht abgeschlossen werden. Es wurde nichts abgebucht."
        : r.code === "betrag"
          ? "Der gezahlte Betrag passt nicht zur Bestellung. Bitte den Support kontaktieren."
          : r.code === "bestellung"
            ? "Die Bestellung wurde nicht gefunden. Bitte den Support kontaktieren."
            : "Die Bestellung konnte nach der Zahlung nicht abgeschlossen werden. Bitte den Support kontaktieren.";
    return NextResponse.json({ ok: false, code: r.code, error }, { status: 422 });
  }

  const origin = canonicalSiteOrigin().replace(/\/$/, "") || new URL(req.url).origin;
  const redirectUrl = `${origin}/checkout/erfolg?nr=${encodeURIComponent(r.orderNumber)}`;

  return NextResponse.json({
    ok: true,
    orderNumber: r.orderNumber,
    redirectUrl,
  });
}
