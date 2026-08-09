"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { createWorkshopSeatHoldForStorefront } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { setWorkshopBookingHoldCookie } from "@/lib/workshop/workshop-booking-cookie";

const log = createLogger("workshops.book-seats-action");

function bookingErrorRedirect(sessionId: string, message: string): never {
  redirect(
    `/termine/${encodeURIComponent(sessionId)}?buchung=fehler&msg=${encodeURIComponent(message)}`,
  );
}

/**
 * Direkte Form-Action (kein useActionState).
 * `redirect()` ist hier korrekt — React #441 entsteht nur, wenn useActionState /
 * manuelles formAction außerhalb von startTransition suspendiert.
 */
export async function startWorkshopCheckoutFormAction(formData: FormData): Promise<void> {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) {
    redirect("/termine?buchung=fehler&msg=" + encodeURIComponent("Termin fehlt."));
  }

  const seatCount = Number.parseInt(String(formData.get("seatCount") ?? ""), 10);

  let bookingId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const session = await getCustomerSession();
    const result = await createWorkshopSeatHoldForStorefront({
      sessionId,
      seatCount,
      customerId: session?.customerId ?? null,
    });

    if (!result.ok) {
      errorMessage = result.message;
    } else {
      await setWorkshopBookingHoldCookie(result.bookingId);
      bookingId = result.bookingId;
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    log.error("workshop_hold_action_failed", { sessionId, ...errorMeta(e) });
    errorMessage = "Reservierung fehlgeschlagen. Bitte später erneut versuchen.";
  }

  if (errorMessage) {
    bookingErrorRedirect(sessionId, errorMessage);
  }

  if (!bookingId) {
    bookingErrorRedirect(sessionId, "Reservierung fehlgeschlagen.");
  }

  redirect("/checkout/termine");
}
