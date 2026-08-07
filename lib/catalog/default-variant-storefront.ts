/** Verkaufsrelevante Felder der Default-Variante (Storefront). */
export type DefaultVariantCommerce = {
  id: string;
  sku: string;
  priceGrossCents: number;
  availableQuantity: number;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
  deliveryTimeKey: string | null;
};

const defaultVariantSelect = {
  id: true,
  sku: true,
  priceGrossCents: true,
  availableQuantity: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
  deliveryTimeKey: true,
} as const;

export const prismaDefaultVariantInclude = {
  where: { isDefault: true, isActive: true },
  take: 1,
  select: defaultVariantSelect,
};

export function pickDefaultVariant<T extends { variants: DefaultVariantCommerce[] }>(
  product: T,
): DefaultVariantCommerce | null {
  return product.variants[0] ?? null;
}

export function quantityRulesFromVariant(v: DefaultVariantCommerce) {
  return {
    availableQuantity: v.availableQuantity,
    minOrderQty: v.minOrderQty,
    purchaseStep: v.purchaseStep,
    maxOrderQty: v.maxOrderQty,
  };
}
