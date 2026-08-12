import { createHash } from "node:crypto";

/**
 * Öffentlicher, maschinenlesbarer Produktkatalog für KI-/Such-Agenten (Epic 14 Slice 4).
 * Nur Storefront-sichtbare Felder — keine Lagerstückzahlen, Kunden- oder Admin-Daten.
 */

export const PUBLIC_PRODUCT_FEED_VERSION = 1 as const;

export type PublicProductAvailability = "in_stock" | "out_of_stock";

export type PublicProductFeedSource = {
  id: string;
  slug: string;
  title: string;
  currency: string;
  updatedAt: Date | string;
  /** Bruttopreis der Default-Variante in Cent (autoritativ wie JSON-LD). */
  priceGrossCents: number;
  /** > 0 → in_stock; nur boolesche Verfügbarkeit, keine Menge. */
  availableQuantity: number;
};

export type PublicProductFeedItem = {
  id: string;
  slug: string;
  title: string;
  url: string;
  price: {
    amountCents: number;
    amount: string;
    currency: string;
  };
  availability: PublicProductAvailability;
  updatedAt: string;
};

export type PublicProductFeedDocument = {
  version: typeof PUBLIC_PRODUCT_FEED_VERSION;
  generatedAt: string;
  productCount: number;
  products: PublicProductFeedItem[];
};

export function resolvePublicAvailability(
  availableQuantity: number,
): PublicProductAvailability {
  return availableQuantity > 0 ? "in_stock" : "out_of_stock";
}

export function formatPublicPriceAmount(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  return (safe / 100).toFixed(2);
}

export function buildPublicProductFeedItem(
  source: PublicProductFeedSource,
  origin: string,
): PublicProductFeedItem {
  const base = origin.replace(/\/$/, "");
  const cents = Number.isFinite(source.priceGrossCents)
    ? Math.max(0, Math.round(source.priceGrossCents))
    : 0;
  const updated =
    source.updatedAt instanceof Date
      ? source.updatedAt
      : new Date(source.updatedAt);

  return {
    id: source.id,
    slug: source.slug,
    title: source.title.trim(),
    url: `${base}/produkte/${source.slug}`,
    price: {
      amountCents: cents,
      amount: formatPublicPriceAmount(cents),
      currency: (source.currency || "EUR").trim().toUpperCase() || "EUR",
    },
    availability: resolvePublicAvailability(source.availableQuantity),
    updatedAt: updated.toISOString(),
  };
}

export function buildPublicProductFeedDocument(
  sources: PublicProductFeedSource[],
  origin: string,
  generatedAt: Date = new Date(),
): PublicProductFeedDocument {
  const products = sources
    .map((s) => buildPublicProductFeedItem(s, origin))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: PUBLIC_PRODUCT_FEED_VERSION,
    generatedAt: generatedAt.toISOString(),
    productCount: products.length,
    products,
  };
}

/** Stabile Weak-ETag aus Feedinhalt (ohne generatedAt, damit Cache bei gleichem Katalog greift). */
export function publicProductFeedEtag(doc: PublicProductFeedDocument): string {
  const stable = {
    version: doc.version,
    productCount: doc.productCount,
    products: doc.products,
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(stable), "utf8")
    .digest("hex")
    .slice(0, 32);
  return `W/"${hash}"`;
}

export function ifNoneMatchMatches(
  ifNoneMatch: string | null,
  etag: string,
): boolean {
  if (!ifNoneMatch?.trim()) return false;
  const wanted = etag.trim();
  return ifNoneMatch
    .split(",")
    .map((p) => p.trim())
    .some((token) => token === "*" || token === wanted);
}
