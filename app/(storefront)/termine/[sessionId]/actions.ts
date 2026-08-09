"use server";

import { createWorkshopSeatHoldForStorefront } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { setWorkshopBookingHoldCookie } from "@/lib/workshop/workshop-booking-cookie";

export type WorkshopBookSeatsActionState =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

/**
 * Hold anlegen — kein `redirect()` (React #441 mit `useActionState` / Client-Form).
 * Erfolg: Client navigiert zu `redirectTo`.
 */
export async function startWorkshopCheckoutAction(
  _prev: WorkshopBookSeatsActionState,
  formData: FormData,
): Promise<WorkshopBookSeatsActionState> {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) {
    return { ok: false, message: "Termin fehlt." };
  }

  const seatCount = Number.parseInt(String(formData.get("seatCount") ?? ""), 10);
  if (!Number.isFinite(seatCount) || seatCount < 1) {
    return { ok: false, message: "Bitte gültige Platzanzahl wählen." };
  }

  const session = await getCustomerSession();

  const result = await createWorkshopSeatHoldForStorefront({
    sessionId,
    seatCount,
    customerId: session?.customerId ?? null,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  await setWorkshopBookingHoldCookie(result.bookingId);
  return { ok: true, redirectTo: "/checkout/termine" };
}
