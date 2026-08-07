import { describe, expect, it } from "vitest";
import { reservationExpiresAt, STOCK_RESERVATION_TTL_MS } from "@/features/inventory";

describe("reservation TTL", () => {
  it("setzt Ablaufzeit 2h nach Start", () => {
    const start = new Date("2026-08-06T12:00:00.000Z");
    const exp = reservationExpiresAt(start);
    expect(exp.getTime() - start.getTime()).toBe(STOCK_RESERVATION_TTL_MS);
  });
});
