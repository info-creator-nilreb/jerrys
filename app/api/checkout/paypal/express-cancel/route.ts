import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { cancelPendingPayPalCheckoutByToken } from "@/lib/checkout/cancel-pending-paypal-by-token";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  payPalApiRateLimitJsonHeaders,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";

/**
 * Smart-Buttons / Apple-Pay `onCancel`: Pending-Express-Bestellung stornieren,
 * damit kein Ghost-Kunde und keine Bestandssperre bleiben.
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

  let body: { paypalOrderId?: unknown } = {};
  try {
    body = (await req.json()) as { paypalOrderId?: unknown };
  } catch {
    body = {};
  }

  const paypalOrderId =
    typeof body.paypalOrderId === "string" ? body.paypalOrderId.trim() : "";
  if (!paypalOrderId) {
    return NextResponse.json({ ok: false, error: "PayPal-Order fehlt." }, { status: 400 });
  }

  const result = await cancelPendingPayPalCheckoutByToken(paypalOrderId);

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  revalidatePath("/produkte");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");

  return NextResponse.json({ ok: true, result });
}
