import { describe, expect, it } from "vitest";
import { adminWorkshopSessionSeriesSchema } from "@/features/workshops/application/admin-workshop-session-schemas";

const baseTemplate = {
  title: "Pearl & Shine",
  timezone: "Europe/Berlin",
  durationMinutes: 120,
  locationLabel: "Werkstatt",
  locationLine1: "Musterstraße 1",
  locationZip: "10115",
  locationCity: "Berlin",
  locationCountry: "DE",
  minimumParticipants: 1,
  capacity: 10,
};

describe("adminWorkshopSessionSeriesSchema", () => {
  it("akzeptiert mehrere Termin-Beginn", () => {
    const result = adminWorkshopSessionSeriesSchema.safeParse({
      ...baseTemplate,
      seriesStartsAtLocal: ["2026-10-01T14:00", "2026-10-08T14:00"],
    });
    expect(result.success).toBe(true);
  });

  it("lehnt doppelte Beginn-Zeit ab", () => {
    const result = adminWorkshopSessionSeriesSchema.safeParse({
      ...baseTemplate,
      seriesStartsAtLocal: ["2026-10-01T14:00", "2026-10-01T14:00"],
    });
    expect(result.success).toBe(false);
  });
});
