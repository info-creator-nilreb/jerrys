/**
 * Shop-spezifische 301-Redirects (Migration / Relaunch).
 * Commerce-Core bleibt generisch — pro Kunde nur diese Datei (oder ein späteres Admin-UI) pflegen.
 *
 * Regel: alte inhaltlich passende URL → neue URL (kein pauschaler Redirect auf `/`).
 */

export type LegacyExactRedirect = {
  /** Normalisierter Pfad mit führendem Slash, lowercase, ohne trailing slash (außer `/`). */
  from: string;
  to: string;
};

/**
 * Exakte Pfad-Umleitungen (höchste Priorität nach Product/CMS-`previousSlug`).
 * Beispiele für jerry-s.com / Shopify-Relaunch — bei Bedarf erweitern.
 */
export const SHOP_LEGACY_EXACT_REDIRECTS: readonly LegacyExactRedirect[] = [
  { from: "/cart", to: "/warenkorb" },
  { from: "/shop", to: "/produkte" },
  { from: "/shop/all", to: "/produkte" },
  { from: "/collections/all", to: "/produkte" },
] as const;
