import { NextResponse, type NextRequest } from "next/server";
import { createPayPalExpressOrder } from "@/lib/checkout/paypal-express-order-flow";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";

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

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await createPayPalExpressOrder({
    idempotencyKey: body.idempotencyKey,
    shippingCountry: body.shippingCountry,
    promotionCode: body.checkoutPromotionCode ?? body.promotionCode,
    declineAutomatic: body.checkoutDeclineAutomatic ?? body.declineAutomatic,
    deliveryMethod: body.deliveryMethod ?? body.checkoutDeliveryMethod,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, fieldErrors: result.fieldErrors },
      { status: 400 },
    );
  }

  if (!result.paymentReady) {
    return NextResponse.json(
      { ok: false, alreadyComplete: true, orderNumber: result.orderNumber },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    paypalOrderId: result.paypalOrderId,
    orderNumber: result.orderNumber,
  });
}
