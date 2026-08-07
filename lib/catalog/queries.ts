import { getPrisma } from "@/lib/db/prisma";
import { prismaDefaultVariantInclude } from "@/lib/catalog/default-variant-storefront";

const storefrontProductCardSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  isBestseller: true,
  priceGrossCents: true,
  currency: true,
  stockQuantity: true,
  availableQuantity: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
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
      variants: prismaDefaultVariantInclude,
    },
  });
}

export async function listProductsForAdmin() {
  return getPrisma().product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
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
        where: { isDefault: true },
        take: 1,
        select: { id: true, sku: true },
      },
    },
  });
}

export async function listManufacturersForAdmin() {
  return getPrisma().manufacturer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
