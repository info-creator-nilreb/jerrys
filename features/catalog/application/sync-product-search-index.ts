import "server-only";

import { buildProductSearchDocument } from "@/features/catalog/domain/product-search-document";
import { createEmbeddingPort } from "@/features/integrations";
import type { EmbeddingPort } from "@/features/integrations";
import { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

export const SEARCH_INDEX_STATE_ID = "default" as const;

export type SearchIndexStatusPublic = {
  embeddingConfigured: boolean;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  documentsTotal: number;
  documentsIndexed: number;
  documentsPending: number;
  documentsError: number;
  documentsExcluded: number;
  activeProductsWithoutDocument: number;
  lastRebuildStartedAt: Date | null;
  lastRebuildFinishedAt: Date | null;
  lastRebuildError: string | null;
  lastRebuildStats: SearchRebuildStats | null;
  /** Kurzer Hinweis für Admin (Fehler / Rebuild / NotConfigured). */
  operatorHint: string;
};

export type SearchRebuildStats = {
  indexed: number;
  skippedUnchanged: number;
  excluded: number;
  errors: number;
  embeddingConfigured: boolean;
};

export type RebuildProductSearchIndexResult =
  | { ok: true; stats: SearchRebuildStats }
  | { ok: false; error: string; stats: SearchRebuildStats };

type ProductIndexRow = {
  id: string;
  isActive: boolean;
  title: string;
  subtitle: string | null;
  leadText: string | null;
  description: string | null;
  categoryTag: string | null;
  featureBullets: string[];
  attributes: Prisma.JsonValue;
  materialText: string | null;
  dimensionsText: string | null;
  weightText: string | null;
  variants: Array<{ availableQuantity: number; isActive: boolean }>;
  collectionMemberships: Array<{
    collection: {
      title: string;
      isActive: boolean;
      categoryLinks: Array<{
        category: { title: string; isActive: boolean };
      }>;
    };
  }>;
};

function parseRebuildStats(raw: unknown): SearchRebuildStats | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const num = (k: string) =>
    typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : 0;
  return {
    indexed: num("indexed"),
    skippedUnchanged: num("skippedUnchanged"),
    excluded: num("excluded"),
    errors: num("errors"),
    embeddingConfigured: o.embeddingConfigured === true,
  };
}

function buildOperatorHint(input: {
  embeddingConfigured: boolean;
  documentsError: number;
  documentsPending: number;
  lastRebuildError: string | null;
  activeProductsWithoutDocument: number;
  lastRebuildFinishedAt: Date | null;
}): string {
  const fallbackNote =
    "Bei Provider-/Indexausfall fällt die Storefront-Vollsuche kontrolliert auf die lexikalische Suche zurück.";
  if (!input.embeddingConfigured) {
    return `Kein Embedding-Anbieter konfiguriert. Lexikalische Suche bleibt aktiv; semantischer Index kann nicht aufgebaut werden. OPENAI_API_KEY unter Integrationen setzen. ${fallbackNote}`;
  }
  if (input.lastRebuildError) {
    return `Letzter Rebuild fehlgeschlagen: ${input.lastRebuildError} ${fallbackNote}`;
  }
  if (input.documentsError > 0) {
    return `${input.documentsError} Dokument(e) im Fehlerstatus. Rebuild erneut ausführen oder Produktdaten prüfen. ${fallbackNote}`;
  }
  if (input.activeProductsWithoutDocument > 0 || input.documentsPending > 0) {
    return `Index unvollständig — Rebuild ausführen, um aktive Produkte nachzuziehen. ${fallbackNote}`;
  }
  if (!input.lastRebuildFinishedAt) {
    return `Index bereit, aber noch kein abgeschlossener Rebuild protokolliert. ${fallbackNote}`;
  }
  return `Index bereit. Embeddings werden nur bei relevanten Inhaltsänderungen aktualisiert. ${fallbackNote}`;
}

async function loadProductsForIndex(productIds?: string[]): Promise<ProductIndexRow[]> {
  return getPrisma().product.findMany({
    where: productIds?.length ? { id: { in: productIds } } : undefined,
    select: {
      id: true,
      isActive: true,
      title: true,
      subtitle: true,
      leadText: true,
      description: true,
      categoryTag: true,
      featureBullets: true,
      attributes: true,
      materialText: true,
      dimensionsText: true,
      weightText: true,
      variants: {
        where: { isActive: true },
        select: { availableQuantity: true, isActive: true },
      },
      collectionMemberships: {
        select: {
          collection: {
            select: {
              title: true,
              isActive: true,
              categoryLinks: {
                select: {
                  category: { select: { title: true, isActive: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

function sourceFromRow(row: ProductIndexRow) {
  const availableQuantityTotal = row.variants.reduce(
    (sum, v) => sum + Math.max(0, v.availableQuantity),
    0,
  );
  const categoryTitles = row.collectionMemberships.flatMap((m) =>
    m.collection.isActive
      ? m.collection.categoryLinks
          .filter((l) => l.category.isActive)
          .map((l) => l.category.title)
      : [],
  );
  const collectionTitles = row.collectionMemberships
    .filter((m) => m.collection.isActive)
    .map((m) => m.collection.title);

  return {
    productId: row.id,
    isActive: row.isActive,
    title: row.title,
    subtitle: row.subtitle,
    leadText: row.leadText,
    descriptionHtml: row.description,
    categoryTag: row.categoryTag,
    categoryTitles,
    collectionTitles,
    featureBullets: row.featureBullets,
    attributes: row.attributes,
    materialText: row.materialText,
    dimensionsText: row.dimensionsText,
    weightText: row.weightText,
    availableQuantityTotal,
    inStock: availableQuantityTotal > 0,
  };
}

async function refreshIndexCounters(): Promise<void> {
  const prisma = getPrisma();
  const [grouped, total] = await Promise.all([
    prisma.productSearchDocument.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.productSearchDocument.count(),
  ]);
  const countFor = (status: string) =>
    grouped.find((g) => g.status === status)?._count._all ?? 0;

  await prisma.searchIndexState.upsert({
    where: { id: SEARCH_INDEX_STATE_ID },
    create: {
      id: SEARCH_INDEX_STATE_ID,
      documentsTotal: total,
      documentsIndexed: countFor("indexed"),
      documentsPending: countFor("pending") + countFor("stale"),
      documentsError: countFor("error"),
      documentsExcluded: countFor("excluded"),
    },
    update: {
      documentsTotal: total,
      documentsIndexed: countFor("indexed"),
      documentsPending: countFor("pending") + countFor("stale"),
      documentsError: countFor("error"),
      documentsExcluded: countFor("excluded"),
    },
  });
}

/**
 * Synchronisiert ein oder alle Produktsuchdokumente und erzeugt Embeddings bei Hash-Änderung.
 * Inaktive Produkte → status excluded, Embedding entfernt.
 */
export async function syncProductSearchDocuments(options?: {
  productIds?: string[];
  embeddingPort?: EmbeddingPort;
  /** Wenn true: Embeddings auch bei gleichem contentHash neu berechnen. */
  forceReembed?: boolean;
}): Promise<SearchRebuildStats> {
  const prisma = getPrisma();
  const port = options?.embeddingPort ?? (await createEmbeddingPort());
  const embeddingConfigured = port.isConfigured();
  const stats: SearchRebuildStats = {
    indexed: 0,
    skippedUnchanged: 0,
    excluded: 0,
    errors: 0,
    embeddingConfigured,
  };

  const rows = await loadProductsForIndex(options?.productIds);

  for (const row of rows) {
    const built = buildProductSearchDocument(sourceFromRow(row));
    const existing = await prisma.productSearchDocument.findUnique({
      where: { productId: row.id },
      select: {
        contentHash: true,
        embedding: true,
        status: true,
      },
    });

    if (!built.indexable) {
      await prisma.productSearchDocument.upsert({
        where: { productId: row.id },
        create: {
          productId: row.id,
          documentText: built.documentText,
          contentHash: built.contentHash,
          status: "excluded",
          lastError: null,
          embedding: Prisma.DbNull,
          embeddingProvider: null,
          embeddingModel: null,
          embeddingDims: null,
          embeddingUpdatedAt: null,
          lastIndexedAt: new Date(),
        },
        update: {
          documentText: built.documentText,
          contentHash: built.contentHash,
          status: "excluded",
          lastError: null,
          embedding: Prisma.DbNull,
          embeddingProvider: null,
          embeddingModel: null,
          embeddingDims: null,
          embeddingUpdatedAt: null,
          lastIndexedAt: new Date(),
        },
      });
      stats.excluded += 1;
      continue;
    }

    const hashUnchanged =
      existing?.contentHash === built.contentHash &&
      existing.embedding != null &&
      existing.status === "indexed";

    if (hashUnchanged && !options?.forceReembed) {
      stats.skippedUnchanged += 1;
      continue;
    }

    if (!embeddingConfigured) {
      await prisma.productSearchDocument.upsert({
        where: { productId: row.id },
        create: {
          productId: row.id,
          documentText: built.documentText,
          contentHash: built.contentHash,
          status: "pending",
          lastError:
            "Embedding-Anbieter nicht konfiguriert — Dokument gespeichert, Embedding ausstehend.",
        },
        update: {
          documentText: built.documentText,
          contentHash: built.contentHash,
          status: "pending",
          lastError:
            "Embedding-Anbieter nicht konfiguriert — Dokument gespeichert, Embedding ausstehend.",
          embedding: Prisma.DbNull,
          embeddingProvider: null,
          embeddingModel: null,
          embeddingDims: null,
          embeddingUpdatedAt: null,
        },
      });
      stats.errors += 1;
      continue;
    }

    const embed = await port.embedTexts({ texts: [built.documentText] });
    if (!embed.ok) {
      await prisma.productSearchDocument.upsert({
        where: { productId: row.id },
        create: {
          productId: row.id,
          documentText: built.documentText,
          contentHash: built.contentHash,
          status: "error",
          lastError: embed.message,
        },
        update: {
          documentText: built.documentText,
          contentHash: built.contentHash,
          status: "error",
          lastError: embed.message,
        },
      });
      stats.errors += 1;
      continue;
    }

    const vector = embed.vectors[0]!;
    await prisma.productSearchDocument.upsert({
      where: { productId: row.id },
      create: {
        productId: row.id,
        documentText: built.documentText,
        contentHash: built.contentHash,
        status: "indexed",
        lastError: null,
        embedding: vector,
        embeddingProvider: embed.meta.provider,
        embeddingModel: embed.meta.model,
        embeddingDims: embed.meta.dims,
        embeddingUpdatedAt: new Date(),
        lastIndexedAt: new Date(),
      },
      update: {
        documentText: built.documentText,
        contentHash: built.contentHash,
        status: "indexed",
        lastError: null,
        embedding: vector,
        embeddingProvider: embed.meta.provider,
        embeddingModel: embed.meta.model,
        embeddingDims: embed.meta.dims,
        embeddingUpdatedAt: new Date(),
        lastIndexedAt: new Date(),
      },
    });
    stats.indexed += 1;
  }

  await refreshIndexCounters();
  return stats;
}

/** Vollständiger Rebuild inkl. Indexstatus-Singleton für Admin. */
export async function rebuildProductSearchIndex(options?: {
  embeddingPort?: EmbeddingPort;
  forceReembed?: boolean;
}): Promise<RebuildProductSearchIndexResult> {
  const prisma = getPrisma();
  const startedAt = new Date();
  await prisma.searchIndexState.upsert({
    where: { id: SEARCH_INDEX_STATE_ID },
    create: {
      id: SEARCH_INDEX_STATE_ID,
      lastRebuildStartedAt: startedAt,
      lastRebuildError: null,
    },
    update: {
      lastRebuildStartedAt: startedAt,
      lastRebuildError: null,
    },
  });

  try {
    const stats = await syncProductSearchDocuments({
      embeddingPort: options?.embeddingPort,
      forceReembed: options?.forceReembed,
    });
    const finishedAt = new Date();
    const fatal =
      !stats.embeddingConfigured && stats.errors > 0
        ? "Embedding-Anbieter nicht konfiguriert. Dokumente als pending gespeichert."
        : null;

    await prisma.searchIndexState.update({
      where: { id: SEARCH_INDEX_STATE_ID },
      data: {
        lastRebuildFinishedAt: finishedAt,
        lastRebuildError: fatal,
        lastRebuildStats: stats,
      },
    });
    await refreshIndexCounters();

    if (fatal) {
      return { ok: false, error: fatal, stats };
    }
    return { ok: true, stats };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unbekannter Fehler beim Suchindex-Rebuild.";
    await prisma.searchIndexState.upsert({
      where: { id: SEARCH_INDEX_STATE_ID },
      create: {
        id: SEARCH_INDEX_STATE_ID,
        lastRebuildStartedAt: startedAt,
        lastRebuildFinishedAt: new Date(),
        lastRebuildError: message,
      },
      update: {
        lastRebuildFinishedAt: new Date(),
        lastRebuildError: message,
      },
    });
    return {
      ok: false,
      error: message,
      stats: {
        indexed: 0,
        skippedUnchanged: 0,
        excluded: 0,
        errors: 1,
        embeddingConfigured: false,
      },
    };
  }
}

export async function getSearchIndexStatusPublic(
  embeddingPort?: EmbeddingPort,
): Promise<SearchIndexStatusPublic> {
  const port = embeddingPort ?? (await createEmbeddingPort());
  const base = {
    embeddingConfigured: port.isConfigured(),
    embeddingProvider: port.providerId(),
    embeddingModel: port.model(),
  };

  try {
    const prisma = getPrisma();
    const [state, activeCount, docsForActive] = await Promise.all([
      prisma.searchIndexState.findUnique({ where: { id: SEARCH_INDEX_STATE_ID } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productSearchDocument.count({
        where: { product: { isActive: true }, status: { not: "excluded" } },
      }),
    ]);

    const activeProductsWithoutDocument = Math.max(0, activeCount - docsForActive);
    const lastRebuildError = state?.lastRebuildError ?? null;
    const documentsError = state?.documentsError ?? 0;
    const documentsPending = state?.documentsPending ?? 0;

    return {
      ...base,
      documentsTotal: state?.documentsTotal ?? 0,
      documentsIndexed: state?.documentsIndexed ?? 0,
      documentsPending,
      documentsError,
      documentsExcluded: state?.documentsExcluded ?? 0,
      activeProductsWithoutDocument,
      lastRebuildStartedAt: state?.lastRebuildStartedAt ?? null,
      lastRebuildFinishedAt: state?.lastRebuildFinishedAt ?? null,
      lastRebuildError,
      lastRebuildStats: parseRebuildStats(state?.lastRebuildStats),
      operatorHint: buildOperatorHint({
        embeddingConfigured: port.isConfigured(),
        documentsError,
        documentsPending,
        lastRebuildError,
        activeProductsWithoutDocument,
        lastRebuildFinishedAt: state?.lastRebuildFinishedAt ?? null,
      }),
    };
  } catch (e) {
    if (!isMissingSchemaError(e)) throw e;
    return {
      ...base,
      documentsTotal: 0,
      documentsIndexed: 0,
      documentsPending: 0,
      documentsError: 0,
      documentsExcluded: 0,
      activeProductsWithoutDocument: 0,
      lastRebuildStartedAt: null,
      lastRebuildFinishedAt: null,
      lastRebuildError: null,
      lastRebuildStats: null,
      operatorHint:
        "Suchindex-Migration fehlt noch. Nach dem Deploy Migration ausführen und Rebuild starten.",
    };
  }
}
