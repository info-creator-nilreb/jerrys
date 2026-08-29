import type { getProductByIdForAdmin } from "@/lib/catalog/queries";
import {
  normalizeProductAttributes,
  reconcileAttributesAndFeatureBullets,
} from "@/features/catalog";
import { migrateLegacySpecsIntoAttributes } from "@/lib/catalog/standard-product-attributes";

type AdminProductRecord = NonNullable<Awaited<ReturnType<typeof getProductByIdForAdmin>>>;

/** Mappt Admin-Produkt + Default-Variante für das Bearbeitungsformular (Contract-Phase). */
export function adminProductForEditForm(product: AdminProductRecord) {
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  if (!defaultVariant) {
    throw new Error(`Produkt ${product.id} hat keine Default-Variante.`);
  }

  const reconciled = reconcileAttributesAndFeatureBullets(
    migrateLegacySpecsIntoAttributes(normalizeProductAttributes(product.attributes), {
      dimensionsText: product.dimensionsText,
      weightText: product.weightText,
      materialText: product.materialText,
    }),
    product.featureBullets,
  );

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
    showWorkshopCalendar: product.showWorkshopCalendar,
    pickupStoreId: product.pickupStoreId,
    pickupReadyHours: product.pickupReadyHours,
    pickupAvailable: product.pickupAvailable,
    leadText: product.leadText,
    variantOptionName: product.variantOptionName,
    dimensionsText: product.dimensionsText,
    weightText: product.weightText,
    materialText: product.materialText,
    featureBullets: reconciled.featureBullets,
    attributes: reconciled.attributes,
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
    collectionTitles: product.collectionMemberships.map((m) => m.collection.title),
    collectionIds: product.collectionMemberships.map((m) => m.collectionId),
    defaultSku: defaultVariant.sku,
  };
}
