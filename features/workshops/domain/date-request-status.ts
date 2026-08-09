export const WORKSHOP_DATE_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

export type WorkshopDateRequestStatus = (typeof WORKSHOP_DATE_REQUEST_STATUSES)[number];

export function workshopDateRequestStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Offen";
    case "approved":
      return "Bestätigt";
    case "rejected":
      return "Abgelehnt";
    default:
      return status;
  }
}

export function isWorkshopDateRequestPending(status: string): boolean {
  return status === "pending";
}
