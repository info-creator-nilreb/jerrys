import { beforeEach, describe, expect, it, vi } from "vitest";

const productFindMany = vi.fn();
const docFindUnique = vi.fn();
const docUpsert = vi.fn();
const docGroupBy = vi.fn();
const docCount = vi.fn();
const productCount = vi.fn();
const stateFindUnique = vi.fn();
const stateUpsert = vi.fn();
const stateUpdate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    product: { findMany: productFindMany, count: productCount },
    productSearchDocument: {
      findUnique: docFindUnique,
      upsert: docUpsert,
      groupBy: docGroupBy,
      count: docCount,
    },
    searchIndexState: {
      findUnique: stateFindUnique,
      upsert: stateUpsert,
      update: stateUpdate,
    },
  }),
}));

vi.mock("@/features/integrations", async () => {
  const actual = await vi.importActual<typeof import("@/features/integrations")>(
    "@/features/integrations",
  );
  return {
    ...actual,
    createEmbeddingPort: vi.fn(),
  };
});

import {
  createNotConfiguredEmbeddingAdapter,
  type EmbeddingPort,
} from "@/features/integrations";
import {
  getSearchIndexStatusPublic,
  rebuildProductSearchIndex,
  syncProductSearchDocuments,
} from "@/features/catalog/server";

function memoryEmbeddingPort(vector = [0.5, 0.25]): EmbeddingPort {
  return {
    providerId: () => "openai",
    isConfigured: () => true,
    model: () => "text-embedding-3-small",
    async embedTexts({ texts }) {
      return {
        ok: true,
        vectors: texts.map(() => vector),
        meta: {
          provider: "openai",
          model: "text-embedding-3-small",
          dims: vector.length,
          requestId: "test",
          usage: null,
        },
      };
    },
  };
}

describe("syncProductSearchDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docGroupBy.mockResolvedValue([]);
    docCount.mockResolvedValue(0);
    stateUpsert.mockResolvedValue({});
    stateUpdate.mockResolvedValue({});
    docUpsert.mockResolvedValue({});
    docFindUnique.mockResolvedValue(null);
  });

  it("indexiert aktive Produkte und schließt inaktive aus", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "active-1",
        isActive: true,
        title: "Aktives Produkt",
        subtitle: null,
        leadText: null,
        description: "<p>Beschreibung</p>",
        categoryTag: null,
        featureBullets: [],
        attributes: [],
        materialText: null,
        dimensionsText: null,
        weightText: null,
        variants: [{ availableQuantity: 4, isActive: true }],
        collectionMemberships: [
          {
            collection: {
              title: "Kollektion",
              isActive: true,
              categoryLinks: [{ category: { title: "Kat", isActive: true } }],
            },
          },
        ],
      },
      {
        id: "inactive-1",
        isActive: false,
        title: "Inaktiv",
        subtitle: null,
        leadText: null,
        description: null,
        categoryTag: null,
        featureBullets: [],
        attributes: [],
        materialText: null,
        dimensionsText: null,
        weightText: null,
        variants: [],
        collectionMemberships: [],
      },
    ]);

    const stats = await syncProductSearchDocuments({
      embeddingPort: memoryEmbeddingPort(),
    });

    expect(stats.indexed).toBe(1);
    expect(stats.excluded).toBe(1);
    expect(stats.errors).toBe(0);
    expect(docUpsert).toHaveBeenCalled();
    const activeCall = docUpsert.mock.calls.find(
      (c) => c[0]?.where?.productId === "active-1",
    );
    expect(activeCall?.[0]?.create?.status).toBe("indexed");
    expect(activeCall?.[0]?.create?.embedding).toEqual([0.5, 0.25]);
    const inactiveCall = docUpsert.mock.calls.find(
      (c) => c[0]?.where?.productId === "inactive-1",
    );
    expect(inactiveCall?.[0]?.create?.status).toBe("excluded");
  });

  it("überspringt unveränderte indexed Dokumente", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        isActive: true,
        title: "Gleich",
        subtitle: null,
        leadText: null,
        description: null,
        categoryTag: null,
        featureBullets: [],
        attributes: [],
        materialText: null,
        dimensionsText: null,
        weightText: null,
        variants: [{ availableQuantity: 1, isActive: true }],
        collectionMemberships: [],
      },
    ]);

    const first = await syncProductSearchDocuments({
      embeddingPort: memoryEmbeddingPort(),
    });
    expect(first.indexed).toBe(1);

    const createdHash = docUpsert.mock.calls[0]?.[0]?.create?.contentHash as string;
    docFindUnique.mockResolvedValue({
      contentHash: createdHash,
      embedding: [0.5, 0.25],
      status: "indexed",
    });
    docUpsert.mockClear();

    const second = await syncProductSearchDocuments({
      embeddingPort: memoryEmbeddingPort(),
    });
    expect(second.skippedUnchanged).toBe(1);
    expect(second.indexed).toBe(0);
    expect(docUpsert).not.toHaveBeenCalled();
  });

  it("speichert pending ohne Embedding-Provider", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        isActive: true,
        title: "Ohne Provider",
        subtitle: null,
        leadText: null,
        description: null,
        categoryTag: null,
        featureBullets: [],
        attributes: [],
        materialText: null,
        dimensionsText: null,
        weightText: null,
        variants: [{ availableQuantity: 1, isActive: true }],
        collectionMemberships: [],
      },
    ]);

    const stats = await syncProductSearchDocuments({
      embeddingPort: createNotConfiguredEmbeddingAdapter(),
    });
    expect(stats.embeddingConfigured).toBe(false);
    expect(stats.errors).toBe(1);
    expect(docUpsert.mock.calls[0]?.[0]?.create?.status).toBe("pending");
  });
});

describe("rebuildProductSearchIndex / getSearchIndexStatusPublic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productFindMany.mockResolvedValue([]);
    docGroupBy.mockResolvedValue([]);
    docCount.mockResolvedValue(0);
    productCount.mockResolvedValue(0);
    stateUpsert.mockResolvedValue({});
    stateUpdate.mockResolvedValue({});
    stateFindUnique.mockResolvedValue({
      documentsTotal: 2,
      documentsIndexed: 1,
      documentsPending: 1,
      documentsError: 0,
      documentsExcluded: 0,
      lastRebuildStartedAt: new Date("2026-08-12T10:00:00Z"),
      lastRebuildFinishedAt: new Date("2026-08-12T10:01:00Z"),
      lastRebuildError: null,
      lastRebuildStats: null,
    });
  });

  it("schreibt Rebuild-Status und liefert Admin-Hinweis", async () => {
    const result = await rebuildProductSearchIndex({
      embeddingPort: memoryEmbeddingPort(),
    });
    expect(result.ok).toBe(true);
    expect(stateUpsert).toHaveBeenCalled();
    expect(stateUpdate).toHaveBeenCalled();

    const status = await getSearchIndexStatusPublic(memoryEmbeddingPort());
    expect(status.embeddingConfigured).toBe(true);
    expect(status.documentsIndexed).toBe(1);
    expect(status.operatorHint).toContain("Index unvollständig");
  });
});
