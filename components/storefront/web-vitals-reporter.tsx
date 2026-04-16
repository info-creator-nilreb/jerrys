"use client";

import { useEffect } from "react";
import type { Metric } from "web-vitals";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

import { webVitalsLogPayload, webVitalsMetricNeedsAttention } from "@/lib/site/web-vitals-config";

/**
 * Production: strukturierte Warnung in der Browser-Konsole, wenn Vitals nicht „good“ sind.
 * Kein Versand an Drittanbieter; optional später `/api`-Endpoint oder Analytics anbinden.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const report = (metric: Metric) => {
      if (!webVitalsMetricNeedsAttention(metric)) {
        return;
      }
      console.warn(JSON.stringify(webVitalsLogPayload(metric)));
    };

    onCLS(report);
    onINP(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
  }, []);

  return null;
}
