/** Verkaufsrelevante Felder einer Variante (Storefront). */
export type StorefrontVariantCommerce = {
  id: string;
  sku: string;
  title: string | null;
  isDefault: boolean;
  priceGrossCents: number;
  listPriceGrossCents: number | null;
  availableQuantity: number;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
  deliveryTimeKey: string | null;
};

/** @deprecated Alias für bestehende Importe */
export type DefaultVariantCommerce = StorefrontVariantCommerce;

const storefrontVariantSelect = {
  id: true,
  sku: true,
  title: true,
  isDefault: true,
  priceGrossCents: true,
  listPriceGrossCents: true,
  availableQuantity: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
  deliveryTimeKey: true,
} as const;

export const prismaDefaultVariantInclude = {
  where: { isDefault: true, isActive: true },
  take: 1,
  select: storefrontVariantSelect,
};

export const prismaStorefrontActiveVariantsInclude = {
  where: { isActive: true },
  orderBy: [{ isDefault: "desc" as const }, { sortOrder: "asc" as const }],
  select: storefrontVariantSelect,
};

export function pickDefaultVariant<T extends { variants: StorefrontVariantCommerce[] }>(
  product: T,
): StorefrontVariantCommerce | null {
  return product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;
}

/**
 * Kunden-sichtbare Variantenbezeichnung — niemals die SKU.
 * Ohne gepflegte Bezeichnung: „Standard“ (Default) bzw. „Variante“.
 */
export function variantOptionLabel(
  v: Pick<StorefrontVariantCommerce, "title" | "sku" | "isDefault">,
): string {
  const t = v.title?.trim();
  if (t) return t;
  return v.isDefault ? "Standard" : "Variante";
}

export function quantityRulesFromVariant(v: StorefrontVariantCommerce) {
  return {
    availableQuantity: v.availableQuantity,
    minOrderQty: v.minOrderQty,
    purchaseStep: v.purchaseStep,
    maxOrderQty: v.maxOrderQty,
  };
}
