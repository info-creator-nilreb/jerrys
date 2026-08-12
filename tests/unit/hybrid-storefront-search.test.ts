import { beforeEach, describe, expect, it, vi } from "vitest";

const docFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    productSearchDocument: {
      findMany: docFindMany,
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
import { searchStorefrontProductsHybrid } from "@/features/catalog/server";

const products = [
  {
    id: "nest",
    title: "Kuschelhöhle",
    slug: "kuschelhoehle",
    subtitle: null as string | null,
  },
  {
    id: "kratz",
    title: "Kratztonne",
    slug: "kratztonne",
    subtitle: "Sisal",
  },
  {
    id: "liege",
    title: "Fensterliege",
    slug: "fensterliege",
    subtitle: null as string | null,
  },
];

function embeddingPort(queryVector: number[]): EmbeddingPort {
  return {
    providerId: () => "openai",
    isConfigured: () => true,
    model: () => "text-embedding-3-small",
    async embedTexts({ texts }) {
      return {
        ok: true,
        vectors: texts.map(() => queryVector),
        meta: {
          provider: "openai",
          model: "text-embedding-3-small",
          dims: queryVector.length,
          requestId: "q",
          usage: null,
        },
      };
    },
  };
}

function failingPort(): EmbeddingPort {
  return {
    providerId: () => "openai",
    isConfigured: () => true,
    model: () => "text-embedding-3-small",
    async embedTexts() {
      return {
        ok: false,
        error: "rate_limited",
        message: "Rate limit",
      };
    },
  };
}

describe("searchStorefrontProductsHybrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nutzt Cosine-Ranking wenn Index und Provider verfügbar sind", async () => {
    docFindMany.mockResolvedValue([
      { productId: "nest", documentText: "Kuschelhöhle Schlafplatz", embedding: [1, 0, 0] },
      { productId: "kratz", documentText: "Kratztonne Sisal", embedding: [0, 1, 0] },
      { productId: "liege", documentText: "Fensterliege", embedding: [0, 0, 1] },
    ]);

    const result = await searchStorefrontProductsHybrid(products, "Schlafplatz", {
      embeddingPort: embeddingPort([0.99, 0.02, 0.01]),
    });

    expect(result.meta.mode).toBe("hybrid");
    expect(result.meta.fallbackReason).toBeNull();
    expect(result.meta.queryEmbeddingRequested).toBe(true);
    expect(result.products[0]?.id).toBe("nest");
  });

  it("fällt bei leerem Index auf Lexik zurück ohne Query-Embedding", async () => {
    docFindMany.mockResolvedValue([]);

    const port = embeddingPort([1, 0, 0]);
    const embedSpy = vi.spyOn(port, "embedTexts");

    const result = await searchStorefrontProductsHybrid(products, "Kratz", {
      embeddingPort: port,
    });

    expect(result.meta.mode).toBe("lexical_fallback");
    expect(result.meta.fallbackReason).toBe("empty_index");
    expect(result.meta.queryEmbeddingRequested).toBe(false);
    expect(embedSpy).not.toHaveBeenCalled();
    expect(result.products.map((p) => p.id)).toEqual(["kratz"]);
  });

  it("fällt bei Providerfehler auf Lexik zurück", async () => {
    docFindMany.mockResolvedValue([
      { productId: "kratz", documentText: "Kratztonne", embedding: [0, 1, 0] },
    ]);

    const result = await searchStorefrontProductsHybrid(products, "Kratz", {
      embeddingPort: failingPort(),
    });

    expect(result.meta.mode).toBe("lexical_fallback");
    expect(result.meta.fallbackReason).toBe("provider_error");
    expect(result.meta.queryEmbeddingRequested).toBe(true);
    expect(result.products.map((p) => p.id)).toEqual(["kratz"]);
  });

  it("fällt ohne konfigurierten Provider auf Lexik zurück", async () => {
    docFindMany.mockResolvedValue([
      { productId: "liege", documentText: "Fensterliege", embedding: [0, 0, 1] },
    ]);

    const result = await searchStorefrontProductsHybrid(products, "Fenster", {
      embeddingPort: createNotConfiguredEmbeddingAdapter(),
    });

    expect(result.meta.mode).toBe("lexical_fallback");
    expect(result.meta.fallbackReason).toBe("not_configured");
    expect(result.meta.queryEmbeddingRequested).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual(["liege"]);
  });

  it("respektiert autoritative Prefilter (z. B. Kategorie)", async () => {
    docFindMany.mockResolvedValue([
      { productId: "nest", documentText: "x", embedding: [1, 0, 0] },
      { productId: "kratz", documentText: "x", embedding: [0.9, 0.1, 0] },
    ]);

    const result = await searchStorefrontProductsHybrid(products, "Katze", {
      embeddingPort: embeddingPort([1, 0, 0]),
      prefilter: (p) => p.id === "kratz",
    });

    expect(result.products.every((p) => p.id === "kratz")).toBe(true);
    expect(docFindMany).toHaveBeenCalled();
  });
});
