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

/**
 * Kompakte Zeile für Landing/PDP-Einbettung (Wochentag + Datum + Uhrzeit).
 * Beispiel: „Sa., 15.08. · 14:00“
 */
export function formatWorkshopSessionDateTimeCompact(
  startsAt: Date,
  timeZone: string,
): string {
  try {
    const weekday = new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      timeZone,
    }).format(startsAt);
    const datePart = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
    }).format(startsAt);
    const timePart = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(startsAt);
    return `${weekday} ${datePart} · ${timePart}`;
  } catch {
    return formatWorkshopSessionDateTime(startsAt, timeZone);
  }
}

export function formatSelfCancelDeadline(deadlineAt: Date, timeZone: string): string {
  return formatWorkshopSessionDateTime(deadlineAt, timeZone);
}
