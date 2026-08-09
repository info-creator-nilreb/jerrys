import { describe, expect, it } from "vitest";
import {
  durationMinutesFromSessionRange,
  snapWorkshopSessionDurationMinutes,
  workshopSessionDurationOptions,
} from "@/lib/workshop/admin-session-duration";

describe("snapWorkshopSessionDurationMinutes", () => {
  it("rundet auf 30 Minuten", () => {
    expect(snapWorkshopSessionDurationMinutes(95)).toBe(90);
    expect(snapWorkshopSessionDurationMinutes(105)).toBe(120);
  });

  it("begrenzt auf Minimum 30", () => {
    expect(snapWorkshopSessionDurationMinutes(10)).toBe(30);
  });
});

describe("durationMinutesFromSessionRange", () => {
  it("leitet Dauer aus Start/Ende ab", () => {
    const start = new Date("2026-09-01T12:00:00.000Z");
    const end = new Date("2026-09-01T15:00:00.000Z");
    expect(durationMinutesFromSessionRange(start, end)).toBe(180);
  });
});

describe("workshopSessionDurationOptions", () => {
  it("liefert 30-Min-Schritte bis 8 Stunden", () => {
    const opts = workshopSessionDurationOptions();
    expect(opts[0]?.value).toBe(30);
    expect(opts.every((o) => o.value % 30 === 0)).toBe(true);
    expect(opts[opts.length - 1]?.value).toBe(480);
  });
});
