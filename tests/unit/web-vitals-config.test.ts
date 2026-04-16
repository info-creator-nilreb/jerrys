import { describe, expect, it } from "vitest";
import { webVitalsMetricNeedsAttention, WEB_VITALS_THRESHOLDS } from "@/lib/site/web-vitals-config";

describe("WEB_VITALS_THRESHOLDS", () => {
  it("enthält erwartete Schwellen-Paare (good / needs-improvement)", () => {
    expect(WEB_VITALS_THRESHOLDS.LCP).toEqual([2500, 4000]);
    expect(WEB_VITALS_THRESHOLDS.INP).toEqual([200, 500]);
    expect(WEB_VITALS_THRESHOLDS.CLS).toEqual([0.1, 0.25]);
  });
});

describe("webVitalsMetricNeedsAttention", () => {
  it("ist false nur bei good", () => {
    expect(webVitalsMetricNeedsAttention({ rating: "good" })).toBe(false);
    expect(webVitalsMetricNeedsAttention({ rating: "needs-improvement" })).toBe(true);
    expect(webVitalsMetricNeedsAttention({ rating: "poor" })).toBe(true);
  });
});
