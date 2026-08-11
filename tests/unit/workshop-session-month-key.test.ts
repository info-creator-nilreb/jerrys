import { describe, expect, it } from "vitest";
import {
  buildWorkshopSessionMonthBuckets,
  formatFurtherSessionsLinkLabel,
  workshopSessionMonthKey,
} from "@/lib/workshop/session-month-key";

describe("workshopSessionMonthKey", () => {
  it("bildet YYYY-MM in der Termin-Zeitzone", () => {
    // 2026-09-15 12:00 UTC → in Europe/Berlin September
    const d = new Date("2026-09-15T12:00:00.000Z");
    expect(workshopSessionMonthKey(d, "Europe/Berlin")).toBe("2026-09");
  });
});

describe("buildWorkshopSessionMonthBuckets", () => {
  it("liefert leeres Array bei einem Monat (Chips unnötig)", () => {
    const sessions = [
      { startsAt: new Date("2026-09-10T10:00:00.000Z"), timezone: "Europe/Berlin" },
      { startsAt: new Date("2026-09-20T10:00:00.000Z"), timezone: "Europe/Berlin" },
    ];
    // Zwei Termine im selben Monat → ein Bucket; UI zeigt Chips erst ab >1
    expect(buildWorkshopSessionMonthBuckets(sessions)).toHaveLength(1);
  });

  it("sammelt mehrere Monate sortiert", () => {
    const sessions = [
      { startsAt: new Date("2026-10-05T10:00:00.000Z"), timezone: "Europe/Berlin" },
      { startsAt: new Date("2026-09-10T10:00:00.000Z"), timezone: "Europe/Berlin" },
      { startsAt: new Date("2026-09-20T10:00:00.000Z"), timezone: "Europe/Berlin" },
    ];
    const buckets = buildWorkshopSessionMonthBuckets(sessions);
    expect(buckets.map((b) => b.key)).toEqual(["2026-09", "2026-10"]);
    expect(buckets[0]?.count).toBe(2);
    expect(buckets[1]?.count).toBe(1);
  });
});

describe("formatFurtherSessionsLinkLabel", () => {
  it("formuliert exakte und abgeschnittene Restmengen", () => {
    expect(
      formatFurtherSessionsLinkLabel({ remaining: 0, poolPossiblyTruncated: false }),
    ).toBeNull();
    expect(
      formatFurtherSessionsLinkLabel({ remaining: 1, poolPossiblyTruncated: false }),
    ).toBe("1 weiteren Termin ansehen");
    expect(
      formatFurtherSessionsLinkLabel({ remaining: 10, poolPossiblyTruncated: false }),
    ).toBe("10 weitere Termine ansehen");
    expect(
      formatFurtherSessionsLinkLabel({ remaining: 10, poolPossiblyTruncated: true }),
    ).toBe("Mehr als 10 weitere Termine ansehen");
  });
});
