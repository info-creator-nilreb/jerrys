import { NextResponse, type NextRequest } from "next/server";
import { updatePayPalExpressShipping } from "@/lib/checkout/paypal-express-update-shipping";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";

/**
 * PayPal `onShippingAddressChange`: Pending-Order + PayPal-Betrag an Lieferland anpassen.
 */
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

  let body: {
    paypalOrderId?: unknown;
    shippingCountry?: unknown;
    checkoutPromotionCode?: unknown;
    checkoutDeclineAutomatic?: unknown;
    deliveryMethod?: unknown;
    checkoutDeliveryMethod?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const paypalOrderId =
    typeof body.paypalOrderId === "string" ? body.paypalOrderId.trim() : "";
  if (!paypalOrderId) {
    return NextResponse.json({ ok: false, error: "paypalOrderId fehlt." }, { status: 400 });
  }

  const result = await updatePayPalExpressShipping({
    paypalOrderId,
    shippingCountry: body.shippingCountry,
    promotionCode: body.checkoutPromotionCode,
    declineAutomatic: body.checkoutDeclineAutomatic,
    deliveryMethod: body.deliveryMethod ?? body.checkoutDeliveryMethod,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.message },
      { status: result.code === "land" ? 422 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    shippingCountry: result.shippingCountry,
    shippingCents: result.shippingCents,
    totalGrossCents: result.totalGrossCents,
    currency: result.currency,
  });
}
