import "server-only";

import {
  buildPublicProductFeedDocument,
  type PublicProductFeedDocument,
  type PublicProductFeedSource,
} from "@/features/catalog/domain/public-product-feed";
import { getPrisma } from "@/lib/db/prisma";
import {
  isNextProductionBuildPhase,
  shouldSkipSitemapDatabase,
} from "@/lib/db/is-database-unreachable";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

async function loadActiveProductsForPublicFeed(): Promise<PublicProductFeedSource[]> {
  if (!process.env.DATABASE_URL?.trim() || isNextProductionBuildPhase()) {
    return [];
  }

  try {
    const rows = await getPrisma().product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        currency: true,
        updatedAt: true,
        variants: {
          where: { isDefault: true, isActive: true },
          take: 1,
          select: {
            priceGrossCents: true,
            availableQuantity: true,
          },
        },
      },
    });

    return rows
      .map((row): PublicProductFeedSource | null => {
        const variant = row.variants[0];
        if (!variant) return null;
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          currency: row.currency,
          updatedAt: row.updatedAt,
          priceGrossCents: variant.priceGrossCents,
          availableQuantity: variant.availableQuantity,
        };
      })
      .filter((row): row is PublicProductFeedSource => row != null);
  } catch (e) {
    if (e instanceof Error && e.message === "DATABASE_URL is not set") {
      return [];
    }
    if (shouldSkipSitemapDatabase(e)) {
      return [];
    }
    throw e;
  }
}

/**
 * Liest nur aktive Produkte mit Default-Variante.
 * Exponiert keine Lagerstückzahlen — nur in_stock / out_of_stock.
 */
export async function getPublicProductFeedDocument(
  origin?: string,
  generatedAt: Date = new Date(),
): Promise<PublicProductFeedDocument> {
  const base =
    (origin?.trim() || canonicalSiteOrigin() || "https://example.com").replace(
      /\/$/,
      "",
    );
  const sources = await loadActiveProductsForPublicFeed();
  return buildPublicProductFeedDocument(sources, base, generatedAt);
}
