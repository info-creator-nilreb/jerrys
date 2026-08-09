/** Haltedauer für Workshop-Plätze während Checkout (Epic 5 Slice 3). */
export const WORKSHOP_SEAT_HOLD_TTL_MS = 30 * 60 * 1000;

export function workshopSeatHoldExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + WORKSHOP_SEAT_HOLD_TTL_MS);
}
