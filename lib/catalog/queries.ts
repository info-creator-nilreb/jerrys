import { getPrisma } from "@/lib/db/prisma";
import { prismaDefaultVariantInclude, prismaStorefrontActiveVariantsInclude } from "@/lib/catalog/default-variant-storefront";

/** Storefront-Produktkarte: Commerce-Felder nur über `variants`. */
export const storefrontProductCardSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  isBestseller: true,
  currency: true,
  amazonRatingAverage: true,
  amazonRatingCount: true,
  amazonReviewUrl: true,
  variants: prismaDefaultVariantInclude,
  images: {
    orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
    select: { url: true, alt: true },
  },
};

export async function listActiveProductsForStorefront() {
  return getPrisma().product.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: storefrontProductCardSelect,
  });
}

export async function getActiveProductBySlug(slug: string) {
  return getPrisma().product.findFirst({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      variants: prismaStorefrontActiveVariantsInclude,
      categoryMemberships: {
        where: { isPrimary: true, category: { isActive: true } },
        take: 1,
        select: {
          category: {
            select: {
              slug: true,
              title: true,
              parent: { select: { slug: true, title: true } },
            },
          },
        },
      },
    },
  });
}

const defaultVariantAdminSelect = {
  id: true,
  sku: true,
  title: true,
  isDefault: true,
  isActive: true,
  taxRatePercent: true,
  priceGrossCents: true,
  priceNetCents: true,
  listPriceGrossCents: true,
  listPriceNetCents: true,
  lowestPrice30dGrossCents: true,
  lowestPrice30dNetCents: true,
  stockQuantity: true,
  availableQuantity: true,
  deliveryTimeKey: true,
  restockDays: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
} as const;

export async function listProductsForAdmin() {
  return getPrisma().product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      variants: {
        where: { isDefault: true },
        take: 1,
        select: { priceGrossCents: true },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  });
}

export async function getProductByIdForAdmin(id: string) {
  return getPrisma().product.findUnique({
    where: { id },
    include: {
      manufacturer: true,
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      variants: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        select: defaultVariantAdminSelect,
      },
      categoryMemberships: {
        orderBy: [{ isPrimary: "desc" }, { category: { title: "asc" } }],
        select: {
          isPrimary: true,
          categoryId: true,
          category: { select: { id: true, title: true, slug: true, isActive: true } },
        },
      },
    },
  });
}

export async function listManufacturersForAdmin() {
  return getPrisma().manufacturer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
