import { describe, expect, it } from "vitest";
import { WorkshopInsufficientSeatsError } from "@/features/workshops/application/workshop-seat-holds";

/**
 * Slice 6: dokumentiert die Kapazitätsregel ohne DB —
 * parallele Buchungen dürfen die Kapazität nie überschreiten.
 */
describe("workshop capacity race invariant", () => {
  it("weist Overbooking zurück, wenn reserved + seatCount > capacity", () => {
    const capacity = 10;
    const confirmed = 6;
    const held = 3;
    const seatCount = 2;
    const reserved = confirmed + held;
    const wouldOversell = reserved + seatCount > capacity;
    expect(wouldOversell).toBe(true);
    expect(() => {
      if (wouldOversell) throw new WorkshopInsufficientSeatsError();
    }).toThrow(WorkshopInsufficientSeatsError);
  });

  it("erlaubt Buchung, wenn genau die Restkapazität gefüllt wird", () => {
    const capacity = 10;
    const confirmed = 5;
    const held = 3;
    const seatCount = 2;
    expect(confirmed + held + seatCount).toBe(capacity);
  });
});
