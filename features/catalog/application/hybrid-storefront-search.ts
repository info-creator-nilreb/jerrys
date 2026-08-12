import "server-only";

import {
  orderProductsByRankedIds,
  parseEmbeddingVector,
  rankHybridCandidates,
  type HybridFallbackReason,
  type HybridRankMode,
  type HybridSearchableProduct,
} from "@/features/catalog/domain/hybrid-product-search";
import { createEmbeddingPort } from "@/features/integrations";
import type { EmbeddingPort } from "@/features/integrations";
import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import {
  filterProductsByStorefrontSearch,
  parseStorefrontSearchQuery,
} from "@/lib/catalog/storefront-product-search";

export type HybridStorefrontSearchMeta = {
  mode: HybridRankMode;
  fallbackReason: HybridFallbackReason | null;
  /** true wenn genau einmal ein Query-Embedding angefordert wurde. */
  queryEmbeddingRequested: boolean;
  candidateCount: number;
  indexedEmbeddingCount: number;
};

export type HybridStorefrontSearchResult<T extends HybridSearchableProduct> = {
  products: T[];
  meta: HybridStorefrontSearchMeta;
};

type IndexedSearchDoc = {
  productId: string;
  documentText: string;
  embedding: unknown;
};

async function loadIndexedSearchDocuments(
  productIds: string[],
): Promise<IndexedSearchDoc[]> {
  if (productIds.length === 0) return [];
  try {
    return await getPrisma().productSearchDocument.findMany({
      where: {
        productId: { in: productIds },
        status: "indexed",
        embedding: { not: Prisma.DbNull },
        product: { isActive: true },
      },
      select: {
        productId: true,
        documentText: true,
        embedding: true,
      },
    });
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

function lexicalOnlyResult<T extends HybridSearchableProduct>(
  products: T[],
  query: string,
  reason: HybridFallbackReason,
  indexedEmbeddingCount: number,
  queryEmbeddingRequested: boolean,
): HybridStorefrontSearchResult<T> {
  return {
    products: filterProductsByStorefrontSearch(products, query),
    meta: {
      mode: "lexical_fallback",
      fallbackReason: reason,
      queryEmbeddingRequested,
      candidateCount: products.length,
      indexedEmbeddingCount,
    },
  };
}

/**
 * Hybride Storefront-Vollsuche: Lexik + Cosine über gespeicherte Embeddings.
 * Bei Provider-/Indexausfall oder leerem Index → reine lexikalische Suche.
 *
 * Typeahead darf diese Funktion nicht pro Tastendruck aufrufen — Query-Embedding
 * nur einmalig für die Vollsuche (Suggest bleibt lexikalisch schnell).
 */
export async function searchStorefrontProductsHybrid<
  T extends HybridSearchableProduct,
>(
  products: T[],
  rawQuery: string | null,
  options?: {
    embeddingPort?: EmbeddingPort;
    /**
     * Autoritative Vorfilter (aktiv ist bereits durch die Produktliste gegeben).
     * Kategorie/Verfügbarkeit bleiben harte Filter — Ranking ändert sie nicht.
     */
    prefilter?: (product: T) => boolean;
  },
): Promise<HybridStorefrontSearchResult<T>> {
  const query = rawQuery ? parseStorefrontSearchQuery(rawQuery) : null;
  if (!query) {
    const base = options?.prefilter ? products.filter(options.prefilter) : products;
    return {
      products: base,
      meta: {
        mode: "lexical_fallback",
        fallbackReason: null,
        queryEmbeddingRequested: false,
        candidateCount: base.length,
        indexedEmbeddingCount: 0,
      },
    };
  }

  const pool = options?.prefilter ? products.filter(options.prefilter) : products;
  if (pool.length === 0) {
    return {
      products: [],
      meta: {
        mode: "lexical_fallback",
        fallbackReason: null,
        queryEmbeddingRequested: false,
        candidateCount: 0,
        indexedEmbeddingCount: 0,
      },
    };
  }

  const docs = await loadIndexedSearchDocuments(pool.map((p) => p.id));
  const embeddingsByProductId = new Map<string, number[]>();
  const documentTextByProductId = new Map<string, string>();

  for (const doc of docs) {
    documentTextByProductId.set(doc.productId, doc.documentText);
    const vector = parseEmbeddingVector(doc.embedding);
    if (vector) embeddingsByProductId.set(doc.productId, vector);
  }

  const indexedEmbeddingCount = embeddingsByProductId.size;

  if (indexedEmbeddingCount === 0) {
    return lexicalOnlyResult(
      pool,
      query,
      docs.length === 0 ? "empty_index" : "no_embeddings",
      indexedEmbeddingCount,
      false,
    );
  }

  const port = options?.embeddingPort ?? (await createEmbeddingPort());
  if (!port.isConfigured()) {
    return lexicalOnlyResult(pool, query, "not_configured", indexedEmbeddingCount, false);
  }

  let queryEmbedding: number[] | null = null;
  let queryEmbeddingRequested = false;
  try {
    queryEmbeddingRequested = true;
    const embed = await port.embedTexts({ texts: [query] });
    if (!embed.ok) {
      return lexicalOnlyResult(
        pool,
        query,
        embed.error === "not_configured" ? "not_configured" : "provider_error",
        indexedEmbeddingCount,
        queryEmbeddingRequested,
      );
    }
    queryEmbedding = embed.vectors[0] ?? null;
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return lexicalOnlyResult(
        pool,
        query,
        "query_embed_failed",
        indexedEmbeddingCount,
        queryEmbeddingRequested,
      );
    }
  } catch {
    return lexicalOnlyResult(
      pool,
      query,
      "provider_error",
      indexedEmbeddingCount,
      queryEmbeddingRequested,
    );
  }

  const { mode, ranked } = rankHybridCandidates({
    products: pool,
    query,
    embeddingsByProductId,
    documentTextByProductId,
    queryEmbedding,
  });

  // Hybrid-Pfad ohne brauchbare Treffer → lexikalischer Fallback (kein leeres semantisches Loch)
  if (mode === "hybrid" && ranked.length === 0) {
    const lexical = filterProductsByStorefrontSearch(pool, query);
    if (lexical.length > 0) {
      return {
        products: lexical,
        meta: {
          mode: "lexical_fallback",
          fallbackReason: null,
          queryEmbeddingRequested,
          candidateCount: pool.length,
          indexedEmbeddingCount,
        },
      };
    }
  }

  return {
    products: orderProductsByRankedIds(
      pool,
      ranked.map((r) => r.productId),
    ),
    meta: {
      mode,
      fallbackReason: mode === "lexical_fallback" ? "no_embeddings" : null,
      queryEmbeddingRequested,
      candidateCount: pool.length,
      indexedEmbeddingCount,
    },
  };
}
