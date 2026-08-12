import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();
const update = vi.fn();
const create = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    aiContentSettings: {
      findUnique,
      upsert,
      update,
      create,
    },
  }),
}));

vi.mock("@/lib/security/secret-crypto", () => ({
  encryptSecret: (v: string) => `enc:${v}`,
  decryptSecret: (v: string) => v.replace(/^enc:/, ""),
}));

import {
  consumeAiContentRequestQuota,
  getAiContentSettingsPublic,
  getAiContentSettingsSecrets,
  saveAiContentSettings,
  verifyOpenAiApiKey,
} from "@/features/integrations";

describe("ai content settings", () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    update.mockReset();
    create.mockReset();
  });

  it("public DTO ohne DB-Zeile nutzt Env-Key", async () => {
    findUnique.mockResolvedValue(null);
    const pub = await getAiContentSettingsPublic({
      OPENAI_API_KEY: "sk-envkey12345",
    } as unknown as NodeJS.ProcessEnv);
    expect(pub.envApiKeyConfigured).toBe(true);
    expect(pub.ready).toBe(true);
    expect(pub.apiKeyMasked).toContain("…");
  });

  it("Secrets: Env hat Vorrang vor DB-Key", async () => {
    findUnique.mockResolvedValue({
      enabled: true,
      apiKeyEnc: "enc:sk-db-key",
      textModel: "gpt-db",
      visionModel: "gpt-db",
      imageModel: "dall-e-3",
      moderationModel: "omni-moderation-latest",
      timeoutMs: 20_000,
      dailyRequestLimit: 50,
    });
    const secrets = await getAiContentSettingsSecrets({
      OPENAI_API_KEY: "sk-env",
    } as unknown as NodeJS.ProcessEnv);
    expect(secrets).toMatchObject({
      apiKey: "sk-env",
      source: "env",
      textModel: "gpt-db",
      dailyRequestLimit: 50,
    });
  });

  it("enabled=false liefert keine Secrets", async () => {
    findUnique.mockResolvedValue({
      enabled: false,
      apiKeyEnc: "enc:sk-db",
      textModel: "gpt-4o-mini",
      visionModel: "gpt-4o-mini",
      imageModel: "dall-e-3",
      moderationModel: "omni-moderation-latest",
      timeoutMs: 30_000,
      dailyRequestLimit: 100,
    });
    const secrets = await getAiContentSettingsSecrets({} as unknown as NodeJS.ProcessEnv);
    expect(secrets).toBeNull();
  });

  it("speichert verschlüsselten Key", async () => {
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({});
    await saveAiContentSettings({
      enabled: true,
      apiKey: "sk-new",
      keepExistingApiKey: false,
      textModel: "gpt-4o-mini",
      visionModel: "gpt-4o-mini",
      imageModel: "dall-e-3",
      moderationModel: "omni-moderation-latest",
      timeoutMs: 30_000,
      dailyRequestLimit: 100,
    });
    expect(upsert).toHaveBeenCalled();
    const arg = upsert.mock.calls[0]?.[0] as {
      create: { apiKeyEnc: string | null };
    };
    expect(arg.create.apiKeyEnc).toBe("enc:sk-new");
  });

  it("Tageslimit blockiert bei Erreichen", async () => {
    const today = new Date().toISOString().slice(0, 10);
    findUnique.mockResolvedValue({
      dailyRequestLimit: 2,
      requestsUsedToday: 2,
      requestsDayKey: today,
    });
    const result = await consumeAiContentRequestQuota();
    expect(result).toMatchObject({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("verifyOpenAiApiKey mappt 401", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 }));
    const result = await verifyOpenAiApiKey({
      apiKey: "sk-bad",
      fetchImpl,
    });
    expect(result).toMatchObject({ ok: false });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/models/gpt-4o-mini"),
      expect.any(Object),
    );
  });

  it("verifyOpenAiApiKey nutzt Moderations-Fallback wenn Model-Lookup scheitert", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    const result = await verifyOpenAiApiKey({
      apiKey: "sk-ok",
      fetchImpl,
    });
    expect(result).toMatchObject({ ok: true });
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("/moderations");
  });
});
