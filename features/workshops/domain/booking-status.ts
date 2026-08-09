export const WORKSHOP_BOOKING_STATUSES = [
  "held",
  "confirmed",
  "cancelled",
  "attended",
  "no_show",
  "refunded",
  "expired",
] as const;

export type WorkshopBookingStatus = (typeof WORKSHOP_BOOKING_STATUSES)[number];

export const WORKSHOP_SESSION_STATUSES = [
  "draft",
  "published",
  "cancelled",
  "completed",
] as const;

export type WorkshopSessionStatus = (typeof WORKSHOP_SESSION_STATUSES)[number];

export function workshopBookingStatusLabel(status: string): string {
  switch (status) {
    case "held":
      return "Reserviert";
    case "confirmed":
      return "Bestätigt";
    case "cancelled":
      return "Storniert";
    case "attended":
      return "Teilgenommen";
    case "no_show":
      return "Nicht erschienen";
    case "refunded":
      return "Erstattet";
    case "expired":
      return "Abgelaufen";
    default:
      return status;
  }
}

/** Nur bestätigte Buchungen können im Kundenportal aktiv storniert werden. */
export function isWorkshopBookingSelfCancellableStatus(status: string): boolean {
  return status === "confirmed";
}
