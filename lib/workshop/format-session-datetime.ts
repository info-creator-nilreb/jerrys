import { formatGermanDateMedium } from "@/lib/i18n/format-german-date";

/** Terminzeit für Storefront (Datum + Uhrzeit in Termin-Zeitzone). */
export function formatWorkshopSessionDateTime(startsAt: Date, timeZone: string): string {
  try {
    const datePart = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone,
    }).format(startsAt);
    const timePart = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(startsAt);
    return `${datePart}, ${timePart} Uhr`;
  } catch {
    return formatGermanDateMedium(startsAt);
  }
}

export function formatSelfCancelDeadline(deadlineAt: Date, timeZone: string): string {
  return formatWorkshopSessionDateTime(deadlineAt, timeZone);
}
