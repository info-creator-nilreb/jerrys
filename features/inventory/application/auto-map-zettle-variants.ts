import "server-only";

import {
  formatZettleAutoMapMessage,
  matchZettleVariants,
  zettleCatalogToMatchInputs,
  type UniqueZettleMatch,
} from "@/features/inventory/domain/zettle-variant-match";
import {
  createZettleClientFromConnection,
  type ZettleCatalogProduct,
} from "@/features/inventory/infrastructure/zettle-client";
import {
  listShopVariantsForZettleMapping,
  upsertZettleProductMapping,
} from "@/features/inventory/infrastructure/zettle-mapping";

export type ZettleAutoMapAmbiguousHint = {
  productVariantId: string;
  method: "sku" | "barcode" | "name";
  candidates: Array<{
    productUuid: string;
    variantUuid: string;
    productName: string;
    variantName: string | null;
    sku: string | null;
  }>;
};

export type AutoMapZettleVariantsResult =
  | {
      ok: true;
      products: ZettleCatalogProduct[];
      mapped: number;
      mappedBySku: number;
      mappedByBarcode: number;
      mappedByName: number;
      ambiguous: number;
      unmatched: number;
      skippedMapped: number;
      saveErrors: string[];
      ambiguousHints: ZettleAutoMapAmbiguousHint[];
    }
  | { ok: false; error: string };

/**
 * Lädt den Zettle-Katalog und speichert nur eindeutige Varianten-Zuordnungen.
 * Mehrdeutige und fehlende Treffer bleiben ungemappt.
 */
export async function autoMapUnmappedZettleVariants(): Promise<AutoMapZettleVariantsResult> {
  const client = await createZettleClientFromConnection();
  if (!client) {
    return { ok: false, error: "Zuerst Zettle verbinden." };
  }

  const products = await client.listProducts();
  const shopRows = await listShopVariantsForZettleMapping();
  const match = matchZettleVariants({
    shopVariants: shopRows.map((row) => ({
      productVariantId: row.productVariantId,
      productTitle: row.productTitle,
      variantTitle: row.variantTitle,
      sku: row.sku,
      mappedZettleVariantUuid: row.zettleVariantUuid,
    })),
    zettleVariants: zettleCatalogToMatchInputs(products),
  });

  const saveErrors: string[] = [];
  const saved: UniqueZettleMatch[] = [];
  for (const unique of match.unique) {
    try {
      await upsertZettleProductMapping({
        productVariantId: unique.productVariantId,
        zettleProductUuid: unique.zettleProductUuid,
        zettleVariantUuid: unique.zettleVariantUuid,
        zettleProductName: unique.zettleProductName,
        zettleVariantName: unique.zettleVariantName,
      });
      saved.push(unique);
    } catch (e) {
      saveErrors.push(
        e instanceof Error ? e.message : "Mapping speichern fehlgeschlagen.",
      );
    }
  }

  return {
    ok: true,
    products,
    mapped: saved.length,
    mappedBySku: saved.filter((u) => u.method === "sku").length,
    mappedByBarcode: saved.filter((u) => u.method === "barcode").length,
    mappedByName: saved.filter((u) => u.method === "name").length,
    ambiguous: match.ambiguous.length,
    unmatched: match.unmatched.length,
    skippedMapped: match.skippedMapped,
    saveErrors,
    ambiguousHints: match.ambiguous.map((row) => ({
      productVariantId: row.productVariantId,
      method: row.method,
      candidates: row.candidates.map((c) => ({
        productUuid: c.productUuid,
        variantUuid: c.variantUuid,
        productName: c.productName,
        variantName: c.variantName,
        sku: c.sku,
      })),
    })),
  };
}

export function formatZettleAutoMapActionMessage(
  result: Extract<AutoMapZettleVariantsResult, { ok: true }>,
): string {
  return formatZettleAutoMapMessage({
    productCount: result.products.length,
    mapped: result.mapped,
    mappedBySku: result.mappedBySku,
    mappedByBarcode: result.mappedByBarcode,
    mappedByName: result.mappedByName,
    ambiguous: result.ambiguous,
    unmatched: result.unmatched,
    skippedMapped: result.skippedMapped,
    saveErrorCount: result.saveErrors.length,
  });
}
