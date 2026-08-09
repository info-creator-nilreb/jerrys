/**
 * Die Middleware schreibt den angefragten Pfad in diesen Request-Header, weil Layouts
 * (Server Components) den Pfad nicht kennen — nötig für ein korrektes `callbackUrl`
 * beim Login aus einer geschützten Seite.
 */
export const REQUEST_PATHNAME_HEADER = "x-storefront-pathname";

/**
 * Nur interne Pfade akzeptieren. Der Header ist grundsätzlich manipulierbar, deshalb wird
 * er wie Nutzereingabe behandelt: keine absoluten oder protokollrelativen URLs.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  const raw = value?.trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\") || raw.includes("\n") || raw.includes("\r")) return fallback;
  return raw;
}
