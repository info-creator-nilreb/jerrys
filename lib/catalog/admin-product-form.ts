import type { getProductByIdForAdmin } from "@/lib/catalog/queries";

type AdminProductRecord = NonNullable<Awaited<ReturnType<typeof getProductByIdForAdmin>>>;

/** Mappt Admin-Produkt + Default-Variante für das Bearbeitungsformular (Contract-Phase). */
export function adminProductForEditForm(product: AdminProductRecord) {
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  if (!defaultVariant) {
    throw new Error(`Produkt ${product.id} hat keine Default-Variante.`);
  }

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    manufacturerId: product.manufacturerId,
    productNumber: product.productNumber,
    priceGrossCents: defaultVariant.priceGrossCents,
    priceNetCents: defaultVariant.priceNetCents,
    taxRatePercent: defaultVariant.taxRatePercent,
    listPriceGrossCents: defaultVariant.listPriceGrossCents,
    listPriceNetCents: defaultVariant.listPriceNetCents,
    lowestPrice30dGrossCents: defaultVariant.lowestPrice30dGrossCents,
    lowestPrice30dNetCents: defaultVariant.lowestPrice30dNetCents,
    stockQuantity: defaultVariant.stockQuantity,
    availableQuantity: defaultVariant.availableQuantity,
    deliveryTimeKey: defaultVariant.deliveryTimeKey,
    restockDays: defaultVariant.restockDays,
    minOrderQty: defaultVariant.minOrderQty,
    purchaseStep: defaultVariant.purchaseStep,
    maxOrderQty: defaultVariant.maxOrderQty,
    isActive: product.isActive,
    sortOrder: product.sortOrder,
    amazonRatingAverage: product.amazonRatingAverage,
    amazonRatingCount: product.amazonRatingCount,
    amazonReviewUrl: product.amazonReviewUrl,
    categoryTag: product.categoryTag,
    isBestseller: product.isBestseller,
    leadText: product.leadText,
    dimensionsText: product.dimensionsText,
    weightText: product.weightText,
    materialText: product.materialText,
    featureBullets: product.featureBullets,
    currency: product.currency,
    images: product.images,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      isDefault: v.isDefault,
      isActive: v.isActive,
      priceGrossCents: v.priceGrossCents,
      availableQuantity: v.availableQuantity,
      stockQuantity: v.stockQuantity,
    })),
    categoryIds: product.categoryMemberships.map((m) => m.categoryId),
    primaryCategoryId:
      product.categoryMemberships.find((m) => m.isPrimary)?.categoryId ?? null,
  };
}
