import { describe, expect, it } from "vitest";
import { SEARCH_EVAL_SET_DE } from "@/features/catalog/domain/search-eval-set.de";
import {
  fallbackRate,
  formatIndexAgeLabel,
  indexAgeHours,
  meanLatencyMs,
  nullHitRate,
} from "@/features/catalog/domain/search-quality-metrics";

describe("search-eval-set.de", () => {
  it("enthält Synonyme, Intentionen und Nulltreffer-Fälle", () => {
    expect(SEARCH_EVAL_SET_DE.length).toBeGreaterThanOrEqual(8);
    expect(SEARCH_EVAL_SET_DE.some((c) => c.intent === "synonym")).toBe(true);
    expect(SEARCH_EVAL_SET_DE.some((c) => c.intent === "typo")).toBe(true);
    expect(SEARCH_EVAL_SET_DE.some((c) => c.intent === "null" && !c.expectNonEmpty)).toBe(
      true,
    );
    expect(SEARCH_EVAL_SET_DE.every((c) => c.query.trim().length > 0)).toBe(true);
  });
});

describe("search-quality-metrics", () => {
  it("berechnet Nulltreffer- und Fallback-Rate", () => {
    expect(
      nullHitRate([
        { hitCount: 0 },
        { hitCount: 2 },
        { hitCount: 0 },
      ]),
    ).toBeCloseTo(2 / 3);
    expect(
      fallbackRate([
        { mode: "hybrid" },
        { mode: "lexical_fallback" },
        { mode: "hybrid" },
      ]),
    ).toBeCloseTo(1 / 3);
  });

  it("mittelt Latenz und formatiert Indexalter", () => {
    expect(meanLatencyMs([{ latencyMs: 10 }, { latencyMs: 30 }])).toBe(20);
    expect(meanLatencyMs([{}])).toBeNull();

    const finished = new Date("2026-08-12T10:00:00Z");
    const now = new Date("2026-08-12T12:30:00Z");
    expect(indexAgeHours(finished, now)).toBeCloseTo(2.5);
    expect(formatIndexAgeLabel(2.5)).toContain("2.5");
    expect(formatIndexAgeLabel(null)).toMatch(/Kein erfolgreicher/);
  });
});
