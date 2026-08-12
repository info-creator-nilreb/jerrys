import type { HybridRankMode } from "@/features/catalog/domain/hybrid-product-search";

/**
 * Schlanke Metrik-Hilfen für Eval-Läufe und Admin-Hinweise (Epic 14 Slice 5).
 * Keine Persistenz — reine Auswertung von Lauf-/Indexdaten.
 */

export type SearchEvalRunResult = {
  caseId: string;
  hitCount: number;
  mode: HybridRankMode;
  latencyMs?: number;
};

/** Anteil Läufe ohne Treffer (0–1). */
export function nullHitRate(results: ReadonlyArray<Pick<SearchEvalRunResult, "hitCount">>): number {
  if (results.length === 0) return 0;
  const zeros = results.filter((r) => r.hitCount <= 0).length;
  return zeros / results.length;
}

/** Anteil Läufe im lexikalischen Fallback (0–1). */
export function fallbackRate(
  results: ReadonlyArray<Pick<SearchEvalRunResult, "mode">>,
): number {
  if (results.length === 0) return 0;
  const fallbacks = results.filter((r) => r.mode === "lexical_fallback").length;
  return fallbacks / results.length;
}

/** Durchschnittliche Latenz in ms; null wenn keine Werte. */
export function meanLatencyMs(
  results: ReadonlyArray<Pick<SearchEvalRunResult, "latencyMs">>,
): number | null {
  const values = results
    .map((r) => r.latencyMs)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Alter des Suchindex in Stunden seit letztem erfolgreichen Rebuild. */
export function indexAgeHours(
  lastRebuildFinishedAt: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (lastRebuildFinishedAt == null) return null;
  const finished =
    lastRebuildFinishedAt instanceof Date
      ? lastRebuildFinishedAt
      : new Date(lastRebuildFinishedAt);
  if (Number.isNaN(finished.getTime())) return null;
  const ms = now.getTime() - finished.getTime();
  if (ms < 0) return 0;
  return ms / (60 * 60 * 1000);
}

export function formatIndexAgeLabel(ageHours: number | null): string {
  if (ageHours == null) return "Kein erfolgreicher Rebuild bekannt";
  if (ageHours < 1) {
    const minutes = Math.max(0, Math.round(ageHours * 60));
    return `Indexalter: ${minutes} Min.`;
  }
  if (ageHours < 48) {
    return `Indexalter: ${ageHours.toFixed(1)} Std.`;
  }
  const days = ageHours / 24;
  return `Indexalter: ${days.toFixed(1)} Tage`;
}
