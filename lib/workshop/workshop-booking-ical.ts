/** RFC 5545 line folding + escaping for TEXT values. */
export function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** UTC-Zeitstempel für iCal (YYYYMMDDTHHMMSSZ). */
export function formatIcalUtcInstant(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export type WorkshopBookingIcalInput = {
  bookingId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  location: string;
  description?: string;
};

export function buildWorkshopBookingIcs(input: WorkshopBookingIcalInput): string {
  const uid = `${input.bookingId}@jerrys-workshop`;
  const now = formatIcalUtcInstant(new Date());
  const dtStart = formatIcalUtcInstant(input.startsAt);
  const dtEnd = formatIcalUtcInstant(input.endsAt);
  const summary = escapeIcalText(input.title);
  const location = escapeIcalText(input.location);
  const description = escapeIcalText(
    input.description ?? "Workshop-Termin bei jerry's",
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jerry's//Workshop Booking//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
