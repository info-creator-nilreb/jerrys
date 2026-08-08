import { getPrisma } from "@/lib/db/prisma";
import { prismaDefaultVariantInclude } from "@/lib/catalog/default-variant-storefront";
import { parseStorefrontSearchQuery } from "@/lib/catalog/storefront-product-search";

export const STOREFRONT_SUGGEST_LIMIT = 6;
export const STOREFRONT_SUGGEST_DEBOUNCE_MS = 250;

export type StorefrontProductSuggestion = {
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  priceGrossCents: number | null;
  currency: string;
};

export type StorefrontProductSuggestResponse = {
  suggestions: StorefrontProductSuggestion[];
};

export async function listStorefrontProductSuggestions(
  rawQuery: string,
): Promise<StorefrontProductSuggestion[]> {
  const term = parseStorefrontSearchQuery(rawQuery);
  if (!term) return [];

  const products = await getPrisma().product.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { subtitle: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: STOREFRONT_SUGGEST_LIMIT,
    select: {
      slug: true,
      title: true,
      subtitle: true,
      currency: true,
      images: {
        orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
        take: 1,
        select: { url: true, alt: true },
      },
      variants: prismaDefaultVariantInclude,
    },
  });

  return products.map((p) => {
    const image = p.images[0] ?? null;
    const variant = p.variants[0] ?? null;
    return {
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? null,
      priceGrossCents: variant?.priceGrossCents ?? null,
      currency: p.currency,
    };
  });
}
