import { describe, expect, it } from "vitest";
import { storefrontWorkshopDateRequestSchema } from "@/features/workshops/application/workshop-date-request-schemas";

describe("storefrontWorkshopDateRequestSchema", () => {
  it("lehnt fehlende E-Mail ab", () => {
    const result = storefrontWorkshopDateRequestSchema.safeParse({
      contactEmail: "not-an-email",
      preferredStartsAtLocal: "2030-06-15T10:00",
      seatCount: 2,
    });
    expect(result.success).toBe(false);
  });

  it("akzeptiert gültige Zukunftsanfrage", () => {
    const result = storefrontWorkshopDateRequestSchema.safeParse({
      contactEmail: "kunde@example.com",
      preferredStartsAtLocal: "2030-06-15T10:00",
      seatCount: 2,
      message: "Team-Event",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt Vergangenheitsdatum ab", () => {
    const result = storefrontWorkshopDateRequestSchema.safeParse({
      contactEmail: "kunde@example.com",
      preferredStartsAtLocal: "2020-01-01T10:00",
      seatCount: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("workshopDateRequestStatusLabel", () => {
  it("kennt pending", async () => {
    const { workshopDateRequestStatusLabel } = await import("@/features/workshops");
    expect(workshopDateRequestStatusLabel("pending")).toBe("Offen");
  });
});
