import { NextResponse, type NextRequest } from "next/server";
import {
  approvePayPalExpressOrder,
  type ApprovePayPalExpressOrderResult,
} from "@/lib/checkout/paypal-express-order-flow";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

function messageForCode(code: Exclude<ApprovePayPalExpressOrderResult, { ok: true }>["code"]): string {
  if (code === "adresse") return "PayPal hat keine vollständige Lieferadresse übermittelt.";
  if (code === "land") return "PayPal Express ist aktuell nur für Lieferadressen in Deutschland verfügbar.";
  if (code === "betrag") return "Der PayPal-Betrag passt nicht zur Bestellung.";
  if (code === "capture") return "Die PayPal-Zahlung konnte nicht abgeschlossen werden.";
  return "PayPal Express konnte nicht abgeschlossen werden.";
}

export async function POST(req: NextRequest) {
  const limited = touchPayPalCheckoutApiAttempt(clientIpFromRequest(req));
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte kurz warten und erneut versuchen." },
      { status: 429, headers: payPalApiRateLimitJsonHeaders(limited.retryAfterSec) },
    );
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json({ ok: false, error: "PayPal ist nicht konfiguriert." }, { status: 503 });
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

  const applePayShippingContact =
    typeof body === "object" && body !== null && "applePayShippingContact" in body
      ? (body as { applePayShippingContact: unknown }).applePayShippingContact
      : null;

  const result = await approvePayPalExpressOrder({
    paypalOrderId: paypalOrderId.trim(),
    applePayShippingContact:
      typeof applePayShippingContact === "object" && applePayShippingContact !== null
        ? applePayShippingContact
        : null,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, error: messageForCode(result.code) }, { status: 422 });
  }

  const origin = canonicalSiteOrigin().replace(/\/$/, "") || new URL(req.url).origin;
  const redirectUrl = `${origin}/checkout/erfolg?nr=${encodeURIComponent(result.orderNumber)}`;
  return NextResponse.json({ ok: true, orderNumber: result.orderNumber, redirectUrl });
}
