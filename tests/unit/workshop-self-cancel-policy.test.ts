import { describe, expect, it } from "vitest";
import {
  evaluateSelfCancelPolicy,
  resolveSelfCancelDeadline,
} from "@/features/workshops";

describe("resolveSelfCancelDeadline", () => {
  it("nutzt Termin-Override vor Shop-Default", () => {
    const startsAt = new Date("2026-08-20T14:00:00.000Z");
    const deadline = resolveSelfCancelDeadline({
      sessionStartsAt: startsAt,
      globalSelfCancelHoursBeforeStart: 48,
      sessionSelfCancelHoursBeforeStart: 24,
    });
    expect(deadline.toISOString()).toBe("2026-08-19T14:00:00.000Z");
  });
});

describe("evaluateSelfCancelPolicy", () => {
  const startsAt = new Date("2026-08-20T14:00:00.000Z");

  it("erlaubt Storno vor Fristende bei bestätigter Buchung", () => {
    const result = evaluateSelfCancelPolicy({
      now: new Date("2026-08-18T12:00:00.000Z"),
      sessionStartsAt: startsAt,
      globalSelfCancelHoursBeforeStart: 48,
      sessionSelfCancelHoursBeforeStart: null,
      bookingStatus: "confirmed",
      sessionStatus: "published",
    });
    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe("allowed");
  });

  it("blockiert Storno nach Fristende", () => {
    const result = evaluateSelfCancelPolicy({
      now: new Date("2026-08-19T15:00:00.000Z"),
      sessionStartsAt: startsAt,
      globalSelfCancelHoursBeforeStart: 48,
      sessionSelfCancelHoursBeforeStart: null,
      bookingStatus: "confirmed",
      sessionStatus: "published",
    });
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe("deadline_passed");
  });

  it("blockiert Storno bei abgesagtem Termin", () => {
    const result = evaluateSelfCancelPolicy({
      now: new Date("2026-08-01T12:00:00.000Z"),
      sessionStartsAt: startsAt,
      globalSelfCancelHoursBeforeStart: 48,
      sessionSelfCancelHoursBeforeStart: null,
      bookingStatus: "confirmed",
      sessionStatus: "cancelled",
    });
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe("session_not_active");
  });
});
