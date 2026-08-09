"use server";

import { redirect } from "next/navigation";
import { createWorkshopSeatHoldForStorefront } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { setWorkshopBookingHoldCookie } from "@/lib/workshop/workshop-booking-cookie";

export type WorkshopBookSeatsActionState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

async function createHoldAndRedirect(sessionId: string, seatCount: number): Promise<never> {
  const session = await getCustomerSession();

  const result = await createWorkshopSeatHoldForStorefront({
    sessionId,
    seatCount,
    customerId: session?.customerId ?? null,
  });

  if (!result.ok) {
    redirect(
      `/termine/${encodeURIComponent(sessionId)}?buchung=fehler&msg=${encodeURIComponent(result.message)}`,
    );
  }

  await setWorkshopBookingHoldCookie(result.bookingId);
  redirect("/checkout/termine");
}

/**
 * Direkte Form-Action (ohne useActionState). redirect() darf hier nicht in useActionState laufen —
 * das führt in Production zu React #441 / Error-Boundary.
 */
export async function startWorkshopCheckoutFormAction(formData: FormData): Promise<void> {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) {
    redirect("/termine?buchung=fehler&msg=" + encodeURIComponent("Termin fehlt."));
  }
  const seatCount = Number.parseInt(String(formData.get("seatCount") ?? ""), 10);
  await createHoldAndRedirect(sessionId, seatCount);
}
