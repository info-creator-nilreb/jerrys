export const WORKSHOP_SESSION_STATUSES = [
  "draft",
  "published",
  "cancelled",
  "completed",
] as const;

export type WorkshopSessionStatus = (typeof WORKSHOP_SESSION_STATUSES)[number];

export function workshopSessionStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "published":
      return "Veröffentlicht";
    case "cancelled":
      return "Abgesagt";
    case "completed":
      return "Abgeschlossen";
    default:
      return status;
  }
}

/** Termin ist für spätere Storefront-Buchung sichtbar/buchbar (Slice 2). */
export function isWorkshopSessionPubliclyListed(status: string): boolean {
  return status === "published";
}
