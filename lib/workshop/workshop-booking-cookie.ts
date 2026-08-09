import { cookies } from "next/headers";

export const WORKSHOP_BOOKING_HOLD_COOKIE = "workshop_booking_hold";

const MAX_AGE_SEC = 60 * 60; // 1h cookie; hold TTL is shorter server-side

export async function getWorkshopBookingHoldIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(WORKSHOP_BOOKING_HOLD_COOKIE)?.value?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export async function setWorkshopBookingHoldCookie(bookingId: string): Promise<void> {
  const jar = await cookies();
  jar.set(WORKSHOP_BOOKING_HOLD_COOKIE, bookingId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearWorkshopBookingHoldCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(WORKSHOP_BOOKING_HOLD_COOKIE);
}
