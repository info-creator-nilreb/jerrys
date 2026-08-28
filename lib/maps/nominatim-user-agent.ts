/** Nominatim verlangt einen identifizierbaren User-Agent. */
export function nominatimUserAgent(fallbackUse = "maps"): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const custom = process.env.NOMINATIM_USER_AGENT?.trim();
  if (custom) return custom;
  if (site) return `JerrysStorefront/1.0 (${site})`;
  return `JerrysStorefront/1.0 (${fallbackUse})`;
}
