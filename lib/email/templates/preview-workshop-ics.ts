import { buildWorkshopBookingIcs } from "@/lib/workshop/workshop-booking-ical";

/** Beispiel-.ics für Admin-Testversand der Terminbestätigung. */
export function buildPreviewWorkshopIcsAttachment(): {
  filename: string;
  content: Buffer;
  contentType: string;
} {
  const ics = buildWorkshopBookingIcs({
    bookingId: "preview-booking",
    title: "Gin Tasting",
    startsAt: new Date("2026-09-20T16:00:00.000Z"),
    endsAt: new Date("2026-09-20T18:00:00.000Z"),
    timezone: "Europe/Berlin",
    location: "jerry's Bar, Berlin",
    description: "2 Plätze · jerry's Bar, Berlin",
  });
  return {
    filename: "jerrys-workshop.ics",
    content: Buffer.from(ics, "utf-8"),
    contentType: "text/calendar; charset=utf-8",
  };
}
