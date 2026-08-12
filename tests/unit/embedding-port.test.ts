import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    aiContentSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  }),
}));

import {
  createEmbeddingPort,
  createNotConfiguredEmbeddingAdapter,
  createOpenAiEmbeddingAdapter,
  resolveOpenAiEmbeddingConfigFromEnv,
} from "@/features/integrations";

describe("NotConfiguredEmbeddingAdapter", () => {
  it("blockt Embeddings ohne Provider", async () => {
    const port = createNotConfiguredEmbeddingAdapter();
    expect(port.isConfigured()).toBe(false);
    expect(port.providerId()).toBeNull();
    expect(port.model()).toBeNull();
    const result = await port.embedTexts({ texts: ["Kerze"] });
    expect(result).toMatchObject({ ok: false, error: "not_configured" });
  });
});

describe("resolveOpenAiEmbeddingConfigFromEnv / createEmbeddingPort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fällt ohne Key auf NotConfigured zurück", async () => {
    const port = await createEmbeddingPort({} as unknown as NodeJS.ProcessEnv);
    expect(port.isConfigured()).toBe(false);
  });

  it("liest Embedding-Modell aus Env", () => {
    const config = resolveOpenAiEmbeddingConfigFromEnv({
      OPENAI_API_KEY: "sk-test",
      OPENAI_EMBEDDING_MODEL: "text-embedding-3-large",
    } as unknown as NodeJS.ProcessEnv);
    expect(config).toMatchObject({
      apiKey: "sk-test",
      embeddingModel: "text-embedding-3-large",
    });
  });
});

describe("createOpenAiEmbeddingAdapter", () => {
  it("mappt /embeddings-Antwort auf Vektoren", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "req-1" },
      json: async () => ({
        data: [
          { index: 0, embedding: [0.1, 0.2, 0.3] },
        ],
        usage: { prompt_tokens: 4, total_tokens: 4 },
      }),
    });

    const port = createOpenAiEmbeddingAdapter({
      config: {
        apiKey: "sk-test",
        baseUrl: "https://api.openai.com/v1",
        embeddingModel: "text-embedding-3-small",
        timeoutMs: 5_000,
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await port.embedTexts({ texts: ["Räucherbox"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.vectors).toEqual([[0.1, 0.2, 0.3]]);
    expect(result.meta).toMatchObject({
      provider: "openai",
      model: "text-embedding-3-small",
      dims: 3,
      requestId: "req-1",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("lehnt leere Eingaben ab", async () => {
    const port = createOpenAiEmbeddingAdapter({
      config: {
        apiKey: "sk-test",
        baseUrl: "https://api.openai.com/v1",
        embeddingModel: "text-embedding-3-small",
        timeoutMs: 5_000,
      },
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    const result = await port.embedTexts({ texts: ["  "] });
    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
  });
});
