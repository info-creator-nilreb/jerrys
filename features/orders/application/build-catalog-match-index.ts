import { getPrisma } from "@/lib/db/prisma";
import {
  type CatalogMatchEntry,
  type CatalogMatchIndex,
  normalizeCatalogMatchText,
  titleVariantMatchKey,
} from "@/features/orders/domain/order-line-catalog-match";

/** Baut Lookup-Indizes für SKU-, Titel- und Varianten-Matching beim Bestellimport. */
export async function buildCatalogMatchIndex(): Promise<CatalogMatchIndex> {
  const bySku = new Map<string, CatalogMatchEntry>();
  const byTitleAndVariant = new Map<string, CatalogMatchEntry>();
  const byTitleDefault = new Map<string, CatalogMatchEntry>();
  const ambiguousTitles = new Set<string>();
  const defaultByTitle = new Map<string, CatalogMatchEntry>();

  try {
    const variants = await getPrisma().productVariant.findMany({
      select: {
        id: true,
        sku: true,
        title: true,
        taxRatePercent: true,
        isDefault: true,
        product: { select: { id: true, title: true, slug: true } },
      },
    });

    for (const v of variants) {
      const entry: CatalogMatchEntry = {
        productId: v.product.id,
        productVariantId: v.id,
        taxRatePercent: v.taxRatePercent,
        sku: v.sku,
        productTitle: v.product.title,
        variantTitle: v.title,
        slug: v.product.slug,
      };

      const sku = v.sku.trim();
      if (sku) {
        bySku.set(sku, entry);
      }

      const tvKey = titleVariantMatchKey(v.product.title, v.title);
      if (!byTitleAndVariant.has(tvKey)) {
        byTitleAndVariant.set(tvKey, entry);
      }

      if (!v.isDefault) continue;

      const titleNorm = normalizeCatalogMatchText(v.product.title);
      if (ambiguousTitles.has(titleNorm)) continue;

      const existing = defaultByTitle.get(titleNorm);
      if (existing && existing.productVariantId !== v.id) {
        defaultByTitle.delete(titleNorm);
        ambiguousTitles.add(titleNorm);
        continue;
      }
      if (!existing) {
        defaultByTitle.set(titleNorm, entry);
      }
    }

    for (const [titleNorm, entry] of defaultByTitle) {
      if (!ambiguousTitles.has(titleNorm)) {
        byTitleDefault.set(titleNorm, entry);
      }
    }
  } catch {
    /* DB optional für Dry-Run ohne Verbindung */
  }

  return { bySku, byTitleAndVariant, byTitleDefault, ambiguousTitles };
}
