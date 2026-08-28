import "server-only";

import { attachShopifyFallbackImages } from "@/lib/catalog/attach-shopify-fallback-images";
import { getPrisma } from "@/lib/db/prisma";
import { prismaDefaultVariantInclude } from "@/lib/catalog/default-variant-storefront";
import { parseStorefrontSearchQuery } from "@/lib/catalog/storefront-product-search";
import {
  STOREFRONT_SUGGEST_LIMIT,
  type StorefrontProductSuggestion,
} from "@/lib/catalog/storefront-product-suggest-shared";

export type {
  StorefrontProductSuggestion,
  StorefrontProductSuggestResponse,
} from "@/lib/catalog/storefront-product-suggest-shared";
export {
  STOREFRONT_SUGGEST_LIMIT,
  STOREFRONT_SUGGEST_DEBOUNCE_MS,
} from "@/lib/catalog/storefront-product-suggest-shared";

/**
 * Typeahead-Vorschläge — bewusst rein lexikalisch (Epic 14 Slice 3).
 * Kein Query-Embedding pro Tastendruck; hybride Semantik nur in der Vollsuche.
 */
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

  const withImages = await attachShopifyFallbackImages(products);
  return withImages.map((p) => {
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
