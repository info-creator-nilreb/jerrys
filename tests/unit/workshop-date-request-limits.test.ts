import { describe, expect, it } from "vitest";
import {
  buildWorkshopDateRequestSeatCountHint,
  buildWorkshopDateRequestSeatCountPlaceholder,
  workshopDateRequestSeatGuidance,
} from "@/lib/workshop/workshop-date-request-limits";

describe("workshopDateRequestSeatGuidance", () => {
  it("baut Hinweis aus typischer Spanne", () => {
    expect(buildWorkshopDateRequestSeatCountHint(3, 12)).toContain("3–12 Personen");
    expect(buildWorkshopDateRequestSeatCountHint(3, 12)).toContain("50 Plätze");
  });

  it("berechnet Placeholder als Mittelwert", () => {
    expect(buildWorkshopDateRequestSeatCountPlaceholder(3, 12)).toBe("z. B. 8");
    expect(buildWorkshopDateRequestSeatCountPlaceholder(3, 10)).toBe("z. B. 7");
  });

  it("liefert zusammengesetzte Guidance", () => {
    const guidance = workshopDateRequestSeatGuidance(4, 8);
    expect(guidance.typicalMinSeats).toBe(4);
    expect(guidance.typicalMaxSeats).toBe(8);
    expect(guidance.hint).toContain("4–8 Personen");
    expect(guidance.placeholder).toBe("z. B. 6");
  });
});
