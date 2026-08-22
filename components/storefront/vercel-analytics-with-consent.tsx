"use client";

import { Analytics } from "@vercel/analytics/react";
import { useSyncExternalStore } from "react";
import { CONSENT_UPDATED_EVENT } from "@/lib/consent/constants";
import { consentAllowsStatistics } from "@/lib/consent/storage";

function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_UPDATED_EVENT, callback);
  return () => window.removeEventListener(CONSENT_UPDATED_EVENT, callback);
}

function readStatisticsConsent(): boolean {
  return consentAllowsStatistics();
}

/**
 * Vercel Web Analytics — nur nach Opt-in „Statistik“ (Cookie-Banner).
 * `@vercel/analytics/next` gehört in Layouts ohne Consent-Gate nicht direkt;
 * hier `@vercel/analytics/react` mit Einwilligungsprüfung.
 */
export function VercelAnalyticsWithConsent() {
  const statisticsAllowed = useSyncExternalStore(
    subscribeConsent,
    readStatisticsConsent,
    () => false,
  );

  if (!statisticsAllowed) {
    return null;
  }

  return (
    <Analytics
      beforeSend={(event) => (consentAllowsStatistics() ? event : null)}
    />
  );
}
