import type { StorefrontWorkshopSessionListItem } from "@/features/workshops";

export type WorkshopSessionMonthBucket = {
  /** Sortierbarer Schlüssel `YYYY-MM` in Termin-Zeitzone. */
  key: string;
  label: string;
  count: number;
};

/** Monatsschlüssel eines Termins in seiner eigenen Zeitzone. */
export function workshopSessionMonthKey(
  startsAt: Date,
  timeZone: string,
): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(startsAt);
    const year = parts.find((p) => p.type === "year")?.value ?? "0000";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    return `${year}-${month}`;
  } catch {
    const y = startsAt.getUTCFullYear();
    const m = String(startsAt.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
}

function monthChipLabel(key: string, includeYear: boolean): string {
  const [y, m] = key.split("-");
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  const monthName = new Intl.DateTimeFormat("de-DE", { month: "short" }).format(date);
  // de-DE short oft mit Punkt: „Sep.“
  const clean = monthName.replace(/\.$/, "");
  return includeYear ? `${clean} ${y}` : clean;
}

/**
 * Monats-Buckets für Embed-Chips — nur sinnvoll, wenn >1 Monat vorkommt.
 */
export function buildWorkshopSessionMonthBuckets(
  sessions: Pick<StorefrontWorkshopSessionListItem, "startsAt" | "timezone">[],
): WorkshopSessionMonthBucket[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const key = workshopSessionMonthKey(s.startsAt, s.timezone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const keys = [...counts.keys()].sort();
  const years = new Set(keys.map((k) => k.slice(0, 4)));
  const includeYear = years.size > 1;
  return keys.map((key) => ({
    key,
    label: monthChipLabel(key, includeYear),
    count: counts.get(key) ?? 0,
  }));
}

/** Footer-Text: exakt oder „Mehr als …“, wenn der Pool abgeschnitten sein kann. */
export function formatFurtherSessionsLinkLabel(options: {
  remaining: number;
  poolPossiblyTruncated: boolean;
}): string | null {
  const { remaining, poolPossiblyTruncated } = options;
  if (remaining <= 0) return null;
  if (poolPossiblyTruncated) {
    return remaining === 1
      ? "Mindestens 1 weiteren Termin ansehen"
      : `Mehr als ${remaining} weitere Termine ansehen`;
  }
  return remaining === 1
    ? "1 weiteren Termin ansehen"
    : `${remaining} weitere Termine ansehen`;
}
