/**
 * Stabile SKU für die Default-Variante beim Backfill und bei neuen Produkten ohne Artikelnummer.
 */
export function defaultVariantSku(product: {
  id: string;
  productNumber: string | null;
}): string {
  const trimmed = product.productNumber?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `SKU-${product.id}`;
}
