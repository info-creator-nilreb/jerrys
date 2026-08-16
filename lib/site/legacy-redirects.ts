import { SHOP_LEGACY_EXACT_REDIRECTS } from "@/config/legacy-redirects";

export type LegacyPatternRedirect = {
  /** RE2/JS-Regex auf normalisierten Pfad (lowercase). */
  pattern: RegExp;
  /** Erste Capture-Group → Ziel-Slug (wird lowercase normalisiert). */
  to: (slug: string) => string;
};

/**
 * Generische Shopify-/Legacy-Muster (Slug bleibt erhalten, Pfadschema wechselt).
 * Gilt für alle Shops mit `/produkte`-Routing; exakte Ausnahmen → `config/legacy-redirects.ts`.
 */
export const LEGACY_PATTERN_REDIRECTS: readonly LegacyPatternRedirect[] = [
  {
    pattern: /^\/products\/([^/]+)$/,
    to: (slug) => `/produkte/${slug.toLowerCase()}`,
  },
  {
    pattern: /^\/collections\/([^/]+)$/,
    to: (slug) => `/kollektionen/${slug.toLowerCase()}`,
  },
  {
    pattern: /^\/pages\/([^/]+)$/,
    to: (slug) => `/${slug.toLowerCase()}`,
  },
] as const;

function normalizeRedirectPath(pathname: string): string {
  const trimmed = pathname.trim().replace(/\/+$/, "") || "/";
  return trimmed.toLowerCase();
}

function exactRedirectMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of SHOP_LEGACY_EXACT_REDIRECTS) {
    map.set(normalizeRedirectPath(entry.from), normalizeRedirectPath(entry.to));
  }
  return map;
}

const exactMap = exactRedirectMap();

/**
 * Liefert den Zielpfad für einen permanenten Redirect (301) oder `null`.
 * Query-String bleibt der Middleware überlassen.
 */
export function resolveLegacyRedirect(pathname: string): string | null {
  const path = normalizeRedirectPath(pathname);
  if (path === "/") return null;

  const exact = exactMap.get(path);
  if (exact && exact !== path) return exact;

  for (const rule of LEGACY_PATTERN_REDIRECTS) {
    const match = path.match(rule.pattern);
    if (match?.[1]) {
      const target = normalizeRedirectPath(rule.to(match[1]));
      if (target !== path) return target;
    }
  }

  return null;
}
