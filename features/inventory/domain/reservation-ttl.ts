/** Standard-Haltedauer für Checkout-Reservierungen (Epic 1). */
export const STOCK_RESERVATION_TTL_MS = 2 * 60 * 60 * 1000;

export function reservationExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + STOCK_RESERVATION_TTL_MS);
}
