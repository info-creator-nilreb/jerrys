import { describe, expect, it } from "vitest";
import { WORKSHOP_SEAT_HOLD_TTL_MS, workshopSeatHoldExpiresAt } from "@/lib/workshop/workshop-hold-ttl";

describe("workshopSeatHoldExpiresAt", () => {
  it("liegt 30 Minuten in der Zukunft", () => {
    const from = new Date("2030-01-01T12:00:00.000Z");
    const exp = workshopSeatHoldExpiresAt(from);
    expect(exp.getTime() - from.getTime()).toBe(WORKSHOP_SEAT_HOLD_TTL_MS);
  });
});

describe("WORKSHOP_BOOKING_EVENT constants", () => {
  it("enthält held und confirmed", async () => {
    const mod = await import("@/features/workshops/application/workshop-booking-events");
    expect(mod.WORKSHOP_BOOKING_EVENT_HELD).toBe("workshop.booking.held");
    expect(mod.WORKSHOP_BOOKING_EVENT_CONFIRMED).toBe("workshop.booking.confirmed");
  });
});
