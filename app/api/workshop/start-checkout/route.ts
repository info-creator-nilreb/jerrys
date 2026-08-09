import { NextResponse } from "next/server";
import { createWorkshopSeatHoldForStorefront } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { WORKSHOP_BOOKING_HOLD_COOKIE } from "@/lib/workshop/workshop-booking-cookie";

export const dynamic = "force-dynamic";

const log = createLogger("api.workshop.start-checkout");

const COOKIE_MAX_AGE_SEC = 60 * 60;

function siteOriginFromRequest(request: Request): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      /* fall through */
    }
  }
  return new URL(request.url);
}

function errorRedirect(request: Request, sessionId: string, message: string) {
  const base = siteOriginFromRequest(request);
  const target = sessionId
    ? new URL(
        `/termine/${encodeURIComponent(sessionId)}?buchung=fehler&msg=${encodeURIComponent(message)}`,
        base,
      )
    : new URL(
        `/termine?buchung=fehler&msg=${encodeURIComponent(message)}`,
        base,
      );
  return NextResponse.redirect(target, 303);
}

/**
 * Klassischer Form-POST → 303 Redirect.
 * Bewusst kein Server Action / React Flight: `redirect()` in Actions kann in Production
 * Minified React error #441 auslösen (Soft-Navigation / Transition).
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    log.warn("workshop_start_checkout_bad_body", errorMeta(e));
    return errorRedirect(request, "", "Ungültige Anfrage.");
  }

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) {
    return errorRedirect(request, "", "Termin fehlt.");
  }

  const seatCount = Number.parseInt(String(formData.get("seatCount") ?? ""), 10);

  try {
    const session = await getCustomerSession();
    const result = await createWorkshopSeatHoldForStorefront({
      sessionId,
      seatCount,
      customerId: session?.customerId ?? null,
    });

    if (!result.ok) {
      return errorRedirect(request, sessionId, result.message);
    }

    const base = siteOriginFromRequest(request);
    const response = NextResponse.redirect(new URL("/checkout/termine", base), 303);
    response.cookies.set(WORKSHOP_BOOKING_HOLD_COOKIE, result.bookingId, {
      httpOnly: true,
      sameSite: "lax",
      secure: base.protocol === "https:",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
    });
    log.info("workshop_start_checkout_redirect", {
      sessionId,
      bookingId: result.bookingId,
    });
    return response;
  } catch (e) {
    log.error("workshop_start_checkout_failed", { sessionId, ...errorMeta(e) });
    return errorRedirect(
      request,
      sessionId,
      "Reservierung fehlgeschlagen. Bitte später erneut versuchen.",
    );
  }
}
