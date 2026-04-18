import { describe, expect, it } from "vitest";
import { derivePromotionDisplayStatus } from "@/lib/promotions/status";

describe("derivePromotionDisplayStatus", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const end = new Date("2026-12-31T23:59:59.999Z");

  it("liefert abgelaufen nach Enddatum", () => {
    expect(
      derivePromotionDisplayStatus(
        { isEnabled: true, publishedOnce: true, startDate: start, endDate: end },
        new Date("2027-01-05T00:00:00.000Z"),
      ),
    ).toBe("abgelaufen");
  });

  it("liefert entwurf wenn nie aktiviert", () => {
    expect(
      derivePromotionDisplayStatus(
        { isEnabled: false, publishedOnce: false, startDate: start, endDate: end },
        new Date("2026-06-01T00:00:00.000Z"),
      ),
    ).toBe("entwurf");
  });

  it("liefert deaktiviert wenn manuell aus und schon veröffentlicht", () => {
    expect(
      derivePromotionDisplayStatus(
        { isEnabled: false, publishedOnce: true, startDate: start, endDate: end },
        new Date("2026-06-01T00:00:00.000Z"),
      ),
    ).toBe("deaktiviert");
  });

  it("liefert geplant wenn aktiviert aber Start in der Zukunft", () => {
    expect(
      derivePromotionDisplayStatus(
        { isEnabled: true, publishedOnce: true, startDate: start, endDate: end },
        new Date("2025-12-01T00:00:00.000Z"),
      ),
    ).toBe("geplant");
  });

  it("liefert aktiv im Fenster", () => {
    expect(
      derivePromotionDisplayStatus(
        { isEnabled: true, publishedOnce: true, startDate: start, endDate: end },
        new Date("2026-06-01T00:00:00.000Z"),
      ),
    ).toBe("aktiv");
  });
});
