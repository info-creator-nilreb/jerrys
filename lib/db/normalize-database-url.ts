/**
 * Entfernt umschließende Anführungszeichen aus Env-URLs (häufig bei Secret-Managers).
 */
export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  let value = raw.trim();
  if (!value) return undefined;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}
