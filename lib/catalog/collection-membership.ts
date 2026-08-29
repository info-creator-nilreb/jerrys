/** Manuelle Produktzuordnung über `collection_products`. */
export const COLLECTION_MEMBERSHIP_MANUAL = "manual" as const;

/** Automatisch: aktive Produkte mit `createdAt` in den letzten `ruleDays` Tagen. */
export const COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS = "created_within_days" as const;

export type CollectionMembershipMode =
  | typeof COLLECTION_MEMBERSHIP_MANUAL
  | typeof COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS;

export const COLLECTION_MEMBERSHIP_MODE_LABELS: Record<CollectionMembershipMode, string> = {
  [COLLECTION_MEMBERSHIP_MANUAL]: "Manuell",
  [COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS]: "Neu (automatisch)",
};

export const DEFAULT_CREATED_WITHIN_DAYS = 30;
export const MIN_CREATED_WITHIN_DAYS = 1;
export const MAX_CREATED_WITHIN_DAYS = 365;

export function parseCollectionMembershipMode(value: unknown): CollectionMembershipMode {
  if (value === COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS) {
    return COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS;
  }
  return COLLECTION_MEMBERSHIP_MANUAL;
}

export function isAutomaticCollectionMembership(mode: string): boolean {
  return mode === COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS;
}

/** UTC-Mitternacht vor X Tagen — konsistente Tagesgrenze für „Neu“-Regeln. */
export function cutoffDateForCreatedWithinDays(ruleDays: number, now = new Date()): Date {
  const safeDays = Math.max(MIN_CREATED_WITHIN_DAYS, Math.floor(ruleDays));
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - safeDays);
  cutoff.setUTCHours(0, 0, 0, 0);
  return cutoff;
}

export function normalizeCreatedWithinRuleDays(
  ruleDays: number | null | undefined,
): number {
  if (ruleDays == null) return DEFAULT_CREATED_WITHIN_DAYS;
  const n = Math.floor(Number(ruleDays));
  if (!Number.isFinite(n)) return DEFAULT_CREATED_WITHIN_DAYS;
  return Math.min(MAX_CREATED_WITHIN_DAYS, Math.max(MIN_CREATED_WITHIN_DAYS, n));
}

export function collectionMembershipModeLabel(mode: string): string {
  if (mode === COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS) {
    return COLLECTION_MEMBERSHIP_MODE_LABELS[COLLECTION_MEMBERSHIP_CREATED_WITHIN_DAYS];
  }
  return COLLECTION_MEMBERSHIP_MODE_LABELS[COLLECTION_MEMBERSHIP_MANUAL];
}
