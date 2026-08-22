/**
 * Shop-spezifische 301-Redirects (Migration / Relaunch).
 * Commerce-Core bleibt generisch — pro Kunde nur diese Datei (oder ein späteres Admin-UI) pflegen.
 */

export type LegacyExactRedirect = {
  /** Normalisierter Pfad mit führendem Slash, lowercase, ohne trailing slash (außer `/`). */
  from: string;
  to: string;
};

export const SHOP_LEGACY_EXACT_REDIRECTS: readonly LegacyExactRedirect[] = [
  { from: "/cart", to: "/warenkorb" },
  { from: "/checkout/cart", to: "/warenkorb" },
  { from: "/shop", to: "/produkte" },
  { from: "/shop/all", to: "/produkte" },
  { from: "/collections/all", to: "/produkte" },

  // Alte Shopware-Seiten
  { from: "/service/rueckgabe", to: "/rueckgabe" },
  { from: "/service/zahlung-versand", to: "/versand" },
  { from: "/informationen/agb", to: "/agb" },
  { from: "/informationen/datenschutz", to: "/datenschutz" },
  { from: "/informationen/impressum", to: "/impressum" },
] as const;
