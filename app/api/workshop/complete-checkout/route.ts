import { NextResponse } from "next/server";
import { createWorkshopOrderFromFormData } from "@/lib/checkout/create-workshop-order-from-form";
import { clientIpFromRequest } from "@/lib/security/client-ip";
import {
  touchWorkshopCheckoutApiAttempt,
  workshopCheckoutApiRateLimitHeaders,
} from "@/lib/security/workshop-checkout-api-rate-limit";
import { createLogger, errorMeta } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

const log = createLogger("api.workshop.complete-checkout");

function requestOrigin(request: Request): URL {
  return new URL(request.url);
}

/**
 * Termin-Checkout per klassischem Form-POST → HTTP 303.
 * Vermeidet Server-Action-`redirect()` / useActionState (React #441 in Production).
 */
export async function POST(request: Request) {
  const base = requestOrigin(request);

  const limited = touchWorkshopCheckoutApiAttempt(clientIpFromRequest(request));
  if (!limited.ok) {
    const res = NextResponse.redirect(
      new URL(
        `/checkout/termine?fehler=${encodeURIComponent("Zu viele Anfragen. Bitte später erneut versuchen.")}`,
        base,
      ),
      303,
    );
    const headers = workshopCheckoutApiRateLimitHeaders(limited.retryAfterSec);
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return res;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    log.warn("workshop_complete_bad_body", errorMeta(e));
    return NextResponse.redirect(
      new URL(`/checkout/termine?fehler=${encodeURIComponent("Ungültige Anfrage.")}`, base),
      303,
    );
  }

  try {
    const result = await createWorkshopOrderFromFormData(formData);

    if (!result.ok) {
      const msg = result.error || "Checkout fehlgeschlagen.";
      return NextResponse.redirect(
        new URL(`/checkout/termine?fehler=${encodeURIComponent(msg)}`, base),
        303,
      );
    }

    if (!result.paymentReady) {
      return NextResponse.redirect(
        new URL(`/checkout/erfolg?nr=${encodeURIComponent(result.orderNumber)}`, base),
        303,
      );
    }

    const approval = result.approvalUrl?.trim();
    if (approval) {
      // Externe PayPal-URL — absolute Location
      return NextResponse.redirect(approval, 303);
    }

    return NextResponse.redirect(
      new URL(`/checkout/erfolg?nr=${encodeURIComponent(result.orderNumber)}`, base),
      303,
    );
  } catch (e) {
    log.error("workshop_complete_failed", errorMeta(e));
    return NextResponse.redirect(
      new URL(
        `/checkout/termine?fehler=${encodeURIComponent("Bestellung fehlgeschlagen. Bitte erneut versuchen.")}`,
        base,
      ),
      303,
    );
  }
}
