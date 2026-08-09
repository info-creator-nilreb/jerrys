"use server";

import { redirect } from "next/navigation";
import { createWorkshopSeatHoldForStorefront } from "@/features/workshops";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { setWorkshopBookingHoldCookie } from "@/lib/workshop/workshop-booking-cookie";

export type WorkshopBookSeatsActionState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

export async function startWorkshopCheckoutAction(
  _prev: WorkshopBookSeatsActionState,
  formData: FormData,
): Promise<WorkshopBookSeatsActionState> {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) {
    return { ok: false, message: "Termin fehlt." };
  }
  const seatCountRaw = formData.get("seatCount");
  const seatCount = Number.parseInt(String(seatCountRaw ?? ""), 10);

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
  redirect("/checkout/termine");
}
