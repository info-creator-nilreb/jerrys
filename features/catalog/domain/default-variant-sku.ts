/**
 * Stabile SKU für die Default-Variante.
 * Priorität: explizite SKU → Produktnummer → `SKU-<productId>`.
 */
export function defaultVariantSku(product: {
  id: string;
  productNumber: string | null;
  /** Explizite SKU aus der Admin-Maske (Default-Variante). */
  sku?: string | null;
}): string {
  const fromSku = product.sku?.trim();
  if (fromSku) return fromSku;
  const trimmed = product.productNumber?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `SKU-${product.id}`;
}
