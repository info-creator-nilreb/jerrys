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
  createAiContentPort,
  createNotConfiguredAiContentAdapter,
  resolveOpenAiContentConfigFromEnv,
} from "@/features/integrations";

describe("NotConfiguredAiContentAdapter", () => {
  it("meldet keine Capabilities und blockt alle Operationen", async () => {
    const port = createNotConfiguredAiContentAdapter();
    expect(port.isConfigured()).toBe(false);
    expect(port.providerId()).toBeNull();
    expect(port.supports("text")).toBe(false);

    const text = await port.generateText({
      kind: "short_description",
      facts: { title: "Test" },
    });
    expect(text).toMatchObject({ ok: false, error: "not_configured" });

    const image = await port.generateImage({ prompt: "Kerze auf Tisch" });
    expect(image).toMatchObject({ ok: false, error: "not_configured" });

    const edited = await port.editImage({
      mode: "cutout",
      source: { bytes: Buffer.from([1]), contentType: "image/png", filename: "x.png" },
    });
    expect(edited).toMatchObject({ ok: false, error: "not_configured" });
  });
});

describe("createAiContentPort / resolveOpenAiContentConfigFromEnv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fällt ohne Key auf NotConfigured zurück", async () => {
    const port = await createAiContentPort({} as unknown as NodeJS.ProcessEnv);
    expect(port.isConfigured()).toBe(false);
    const result = await port.moderate({ text: "hallo" });
    expect(result).toMatchObject({ ok: false, error: "not_configured" });
  });

  it("liest Modell-Defaults aus Env", () => {
    const config = resolveOpenAiContentConfigFromEnv({
      OPENAI_API_KEY: " sk-test ",
      OPENAI_TEXT_MODEL: "gpt-test",
    } as unknown as NodeJS.ProcessEnv);
    expect(config).toMatchObject({
      apiKey: "sk-test",
      textModel: "gpt-test",
      visionModel: "gpt-4o-mini",
      imageModel: "dall-e-3",
      imageEditModel: "gpt-image-1",
      moderationModel: "omni-moderation-latest",
    });
  });
});
