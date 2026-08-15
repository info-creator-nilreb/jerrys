import { NextResponse, type NextRequest } from "next/server";
import { quoteExpressShippingForCart } from "@/lib/checkout/express-shipping-quote";
import { parseExpressPromotionInput } from "@/lib/checkout/express-promotion";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";

/** Versandquote für Apple-Pay-/Express-Sheet (noch ohne Pending-Order). */
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

  let body: { shippingCountry?: unknown; checkoutPromotionCode?: unknown; checkoutDeclineAutomatic?: unknown } =
    {};
  try {
    body = (await req.json()) as { shippingCountry?: unknown };
  } catch {
    body = {};
  }

  const quote = await quoteExpressShippingForCart(
    body.shippingCountry,
    parseExpressPromotionInput(body),
  );
  if (!quote.ok) {
    return NextResponse.json(
      { ok: false, code: quote.code, error: quote.message },
      { status: quote.code === "land" ? 422 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    shippingCountry: quote.shippingCountry,
    shippingCents: quote.shippingCents,
    subtotalCents: quote.subtotalCents,
    totalGrossCents: quote.totalGrossCents,
    currency: quote.currency,
  });
}
