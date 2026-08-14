export type CatalogMatchEntry = {
  productId: string;
  productVariantId: string;
  taxRatePercent: number;
  sku: string;
  productTitle: string;
  variantTitle: string | null;
  slug: string;
};

export type CatalogMatchIndex = {
  bySku: Map<string, CatalogMatchEntry>;
  byTitleAndVariant: Map<string, CatalogMatchEntry>;
  byTitleDefault: Map<string, CatalogMatchEntry>;
  ambiguousTitles: Set<string>;
};

export type OrderLineMatchMethod = "sku" | "title_variant" | "title_default";

export type OrderLineMatchResult =
  | { matched: true; entry: CatalogMatchEntry; method: OrderLineMatchMethod }
  | { matched: false; reason: "ambiguous_title" | "not_found" };

/** Normalisiert Titel/Varianten für Lookup (case-insensitive, Whitespace). */
export function normalizeCatalogMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Shopify „Lineitem name“: „Produkttitel - Variante“ (erstes „ - “ trennt).
 */
export function parseShopifyLineItemName(raw: string): {
  productTitle: string;
  variantTitle: string | null;
} {
  const trimmed = raw.trim();
  const sep = trimmed.indexOf(" - ");
  if (sep === -1) {
    return { productTitle: trimmed, variantTitle: null };
  }
  return {
    productTitle: trimmed.slice(0, sep).trim(),
    variantTitle: trimmed.slice(sep + 3).trim() || null,
  };
}

export function titleVariantMatchKey(productTitle: string, variantTitle: string | null): string {
  return `${normalizeCatalogMatchText(productTitle)}\0${normalizeCatalogMatchText(variantTitle ?? "")}`;
}

export function matchOrderLineToCatalog(params: {
  sku: string;
  lineTitle: string;
  index: CatalogMatchIndex;
}): OrderLineMatchResult {
  const sku = params.sku.trim();
  if (sku) {
    const bySku = params.index.bySku.get(sku);
    if (bySku) {
      return { matched: true, entry: bySku, method: "sku" };
    }
  }

  const parsed = parseShopifyLineItemName(params.lineTitle);
  const titleNorm = normalizeCatalogMatchText(parsed.productTitle);
  if (!titleNorm) {
    return { matched: false, reason: "not_found" };
  }

  if (parsed.variantTitle) {
    const variantKey = titleVariantMatchKey(parsed.productTitle, parsed.variantTitle);
    const byTitleVariant = params.index.byTitleAndVariant.get(variantKey);
    if (byTitleVariant) {
      return { matched: true, entry: byTitleVariant, method: "title_variant" };
    }
  }

  if (params.index.ambiguousTitles.has(titleNorm)) {
    return { matched: false, reason: "ambiguous_title" };
  }

  const byTitleDefault = params.index.byTitleDefault.get(titleNorm);
  if (byTitleDefault) {
    return { matched: true, entry: byTitleDefault, method: "title_default" };
  }

  return { matched: false, reason: "not_found" };
}
