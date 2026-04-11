import { z } from "zod";
import { CONSENT_JSON_VERSION, CONSENT_STORAGE_KEY } from "@/lib/consent/constants";
import type { StoredConsent } from "@/lib/consent/types";

const storedConsentSchema = z.object({
  v: z.number().int().positive(),
  statistics: z.boolean(),
  marketing: z.boolean(),
  savedAt: z.string().min(1),
});

export function parseConsentJson(raw: string | null | undefined): StoredConsent | null {
  if (raw === null || raw === undefined || !raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const r = storedConsentSchema.safeParse(parsed);
    if (!r.success) return null;
    if (r.data.v !== CONSENT_JSON_VERSION) return null;
    return r.data;
  } catch {
    return null;
  }
}

export function serializeConsent(c: StoredConsent): string {
  return JSON.stringify(c);
}

export function buildConsentRecord(partial: Pick<StoredConsent, "statistics" | "marketing">): StoredConsent {
  return {
    v: CONSENT_JSON_VERSION,
    statistics: partial.statistics,
    marketing: partial.marketing,
    savedAt: new Date().toISOString(),
  };
}

export function readConsentFromWindow(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  return parseConsentJson(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

export function writeConsentToWindow(record: StoredConsent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(record));
}

export function hasValidConsentRecord(): boolean {
  return readConsentFromWindow() !== null;
}

export function consentAllowsStatistics(): boolean {
  return readConsentFromWindow()?.statistics ?? false;
}

export function consentAllowsMarketing(): boolean {
  return readConsentFromWindow()?.marketing ?? false;
}
