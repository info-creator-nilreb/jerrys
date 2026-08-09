/**
 * Vorauswahl des Landes in Adressformularen.
 *
 * Reihenfolge: Geo-Hinweis des CDN (nur wenn das Land auch belieferbar ist) → `DE`
 * → erstes erlaubtes Land. Ohne diese Regel gewinnt sonst die alphabetische
 * Sortierung der Versandländer (z. B. „AT“ vor „DE“).
 */
export const FALLBACK_SHIPPING_COUNTRY = "DE";

export function resolvePreferredShippingCountry(
  allowedCountryCodes: readonly string[],
  geoCountryCode?: string | null,
): string {
  const allowed = allowedCountryCodes
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length === 2);
  if (!allowed.length) return FALLBACK_SHIPPING_COUNTRY;

  const geo = geoCountryCode?.trim().toUpperCase();
  if (geo && geo.length === 2 && allowed.includes(geo)) return geo;

  if (allowed.includes(FALLBACK_SHIPPING_COUNTRY)) return FALLBACK_SHIPPING_COUNTRY;
  return allowed[0]!;
}

/** Geo-Header von Vercel bzw. Cloudflare; lokal meist nicht gesetzt. */
export function geoCountryFromHeaders(h: {
  get(name: string): string | null;
}): string | null {
  for (const name of ["x-vercel-ip-country", "cf-ipcountry"]) {
    const value = h.get(name)?.trim();
    if (value && value.length === 2) return value.toUpperCase();
  }
  return null;
}
