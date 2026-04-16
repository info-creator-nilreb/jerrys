import type { Metric } from "web-vitals";
import { CLSThresholds, FCPThresholds, INPThresholds, LCPThresholds, TTFBThresholds } from "web-vitals";

/**
 * Referenz-Schwellen (Google / web-vitals), für Doku und Tests.
 * Laufzeit-Rating kommt von `metric.rating` aus web-vitals.
 */
export const WEB_VITALS_THRESHOLDS = {
  CLS: CLSThresholds,
  FCP: FCPThresholds,
  INP: INPThresholds,
  LCP: LCPThresholds,
  TTFB: TTFBThresholds,
} as const;

/** Nur Metriken loggen, die nicht im „good“-Bereich liegen (Production-RUM). */
export function webVitalsMetricNeedsAttention(metric: Pick<Metric, "rating">): boolean {
  return metric.rating !== "good";
}

export function webVitalsLogPayload(metric: Metric): Record<string, unknown> {
  return {
    scope: "web-vitals",
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };
}
