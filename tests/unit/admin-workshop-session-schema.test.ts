import { describe, expect, it } from "vitest";
import { adminWorkshopSessionUpsertSchema } from "@/features/workshops/application/admin-workshop-session-schemas";
import { parseLocalDateTimeInTimeZone } from "@/lib/workshop/admin-datetime";

describe("adminWorkshopSessionUpsertSchema", () => {
  it("akzeptiert gültige Termindaten", () => {
    const result = adminWorkshopSessionUpsertSchema.safeParse({
      title: "Keramik-Workshop",
      timezone: "Europe/Berlin",
      startsAtLocal: "2026-09-01T14:00",
      endsAtLocal: "2026-09-01T17:00",
      locationLabel: "Berlin",
      priceEuro: "49,00",
      currency: "EUR",
      minimumParticipants: 3,
      capacity: 10,
      maxSeatsPerBooking: "",
      selfCancelHoursBeforeStart: "",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt Ende vor Beginn ab", () => {
    const result = adminWorkshopSessionUpsertSchema.safeParse({
      title: "Test",
      timezone: "Europe/Berlin",
      startsAtLocal: "2026-09-01T17:00",
      endsAtLocal: "2026-09-01T14:00",
      locationLabel: "Berlin",
      minimumParticipants: 1,
      capacity: 5,
    });
    expect(result.success).toBe(false);
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
