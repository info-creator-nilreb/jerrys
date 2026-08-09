import { describe, expect, it } from "vitest";
import {
  adminWorkshopSessionUpsertSchema,
  adminWorkshopSessionUpsertToData,
} from "@/features/workshops/application/admin-workshop-session-schemas";
import { parseLocalDateTimeInTimeZone } from "@/lib/workshop/admin-datetime";
import { addWorkshopDurationMinutes } from "@/lib/workshop/admin-session-duration";

describe("adminWorkshopSessionUpsertSchema", () => {
  it("akzeptiert gültige Termindaten mit Dauer", () => {
    const result = adminWorkshopSessionUpsertSchema.safeParse({
      title: "Keramik-Workshop",
      timezone: "Europe/Berlin",
      startsAtLocal: "2026-09-01T14:00",
      durationMinutes: 180,
      locationLabel: "Werkstatt",
      locationLine1: "Musterstraße 1",
      locationZip: "10115",
      locationCity: "Berlin",
      locationCountry: "DE",
      priceEuro: "49,00",
      currency: "EUR",
      minimumParticipants: 3,
      capacity: 10,
      maxSeatsPerBooking: "",
      selfCancelHoursBeforeStart: "",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt Dauer außerhalb 30-Min-Raster ab", () => {
    const result = adminWorkshopSessionUpsertSchema.safeParse({
      title: "Test",
      timezone: "Europe/Berlin",
      startsAtLocal: "2026-09-01T14:00",
      durationMinutes: 95,
      locationLabel: "Berlin",
      locationLine1: "Test 1",
      locationZip: "10115",
      locationCity: "Berlin",
      minimumParticipants: 1,
      capacity: 5,
    });
    expect(result.success).toBe(false);
  });

  it("berechnet endsAt aus Beginn und Dauer", () => {
    const parsed = adminWorkshopSessionUpsertSchema.parse({
      title: "Test",
      timezone: "Europe/Berlin",
      startsAtLocal: "2026-09-01T14:00",
      durationMinutes: 120,
      locationLabel: "Berlin",
      locationLine1: "Test 1",
      locationZip: "10115",
      locationCity: "Berlin",
      minimumParticipants: 1,
      capacity: 5,
    });
    const data = adminWorkshopSessionUpsertToData(parsed);
    const startsAt = parseLocalDateTimeInTimeZone("2026-09-01T14:00", "Europe/Berlin")!;
    expect(data.startsAt.getTime()).toBe(startsAt.getTime());
    expect(data.endsAt.getTime()).toBe(addWorkshopDurationMinutes(startsAt, 120).getTime());
  });
});

describe("parseLocalDateTimeInTimeZone", () => {
  it("interpretiert datetime-local in Europe/Berlin", () => {
    const utc = parseLocalDateTimeInTimeZone("2026-01-15T12:00", "Europe/Berlin");
    expect(utc).not.toBeNull();
    const back = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(utc!);
    expect(back).toBe("12:00");
  });
});
