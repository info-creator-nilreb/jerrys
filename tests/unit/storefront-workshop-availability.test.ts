import { describe, expect, it } from "vitest";
import { computeStorefrontWorkshopSessionView } from "@/features/workshops";

const now = new Date("2026-08-01T12:00:00.000Z");
const startsAt = new Date("2026-08-10T14:00:00.000Z");
const endsAt = new Date("2026-08-10T17:00:00.000Z");

describe("computeStorefrontWorkshopSessionView", () => {
  it("meldet ausgebucht ohne freie Plätze", () => {
    const view = computeStorefrontWorkshopSessionView({
      status: "published",
      startsAt,
      endsAt,
      now,
      capacity: 10,
      confirmedSeatCount: 8,
      heldSeatCount: 2,
      minimumParticipants: 3,
    });
    expect(view.availability).toBe("sold_out");
    expect(view.seatsRemaining).toBe(0);
  });

  it("meldet Mindestteilnehmer offen bei freien Plätzen", () => {
    const view = computeStorefrontWorkshopSessionView({
      status: "published",
      startsAt,
      endsAt,
      now,
      capacity: 10,
      confirmedSeatCount: 1,
      heldSeatCount: 0,
      minimumParticipants: 3,
    });
    expect(view.availability).toBe("minimum_not_met");
    expect(view.seatsRemaining).toBe(9);
  });

  it("meldet buchbar wenn Mindestteilnehmer erreicht", () => {
    const view = computeStorefrontWorkshopSessionView({
      status: "published",
      startsAt,
      endsAt,
      now,
      capacity: 10,
      confirmedSeatCount: 3,
      heldSeatCount: 0,
      minimumParticipants: 3,
    });
    expect(view.availability).toBe("bookable");
  });
});
