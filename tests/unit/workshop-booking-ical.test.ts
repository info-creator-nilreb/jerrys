import { describe, expect, it } from "vitest";
import {
  buildWorkshopBookingIcs,
  escapeIcalText,
  formatIcalUtcInstant,
} from "@/lib/workshop/workshop-booking-ical";

describe("workshop-booking-ical", () => {
  it("escapes special characters in TEXT fields", () => {
    expect(escapeIcalText("a;b,c\n")).toBe("a\\;b\\,c\\n");
  });

  it("formats UTC instants for DTSTART/DTEND", () => {
    const d = new Date("2026-08-15T14:30:00.000Z");
    expect(formatIcalUtcInstant(d)).toBe("20260815T143000Z");
  });

  it("builds a minimal valid VCALENDAR with VEVENT", () => {
    const ics = buildWorkshopBookingIcs({
      bookingId: "bk_test",
      title: "Workshop Titel",
      startsAt: new Date("2026-08-15T14:00:00.000Z"),
      endsAt: new Date("2026-08-15T16:00:00.000Z"),
      timezone: "Europe/Berlin",
      location: "Berlin",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:bk_test@jerrys-workshop");
    expect(ics).toContain("SUMMARY:Workshop Titel");
    expect(ics).toContain("LOCATION:Berlin");
    expect(ics).toContain("DTSTART:20260815T140000Z");
    expect(ics).toContain("DTEND:20260815T160000Z");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});
