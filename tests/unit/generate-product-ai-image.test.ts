import { describe, expect, it, vi, beforeEach } from "vitest";

const generateImage = vi.fn();
const moderate = vi.fn();
const describeImage = vi.fn();

vi.mock("@/features/integrations/application/create-ai-content-port", () => ({
  createAiContentPort: async () => ({
    isConfigured: () => true,
    supports: () => true,
    generateImage,
    moderate,
    describeImage,
  }),
}));

import { generateProductAiImageDraft } from "@/features/integrations";

describe("generateProductAiImageDraft", () => {
  beforeEach(() => {
    generateImage.mockReset();
    moderate.mockReset();
    describeImage.mockReset();
  });

  it("liefert Vorschau nach erfolgreicher Moderation", async () => {
    generateImage.mockResolvedValue({
      ok: true,
      temporaryImageUrl: "https://example.com/tmp.png",
      temporaryImageBase64: null,
      meta: {
        provider: "openai",
        model: "dall-e-3",
        capability: "image_generation",
        requestId: null,
        usage: null,
      },
    });
    moderate.mockResolvedValue({
      ok: true,
      flagged: false,
      categories: [],
      meta: {
        provider: "openai",
        model: "omni-moderation-latest",
        capability: "moderation",
        requestId: null,
        usage: null,
      },
    });

    const result = await generateProductAiImageDraft({
      prompt: "Kerze auf Tisch",
      facts: { title: "Duftkerze" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.previewSrc).toBe("https://example.com/tmp.png");
    expect(result.moderation.flagged).toBe(false);
  });

  it("blockiert gemoderierte Bilder", async () => {
    generateImage.mockResolvedValue({
      ok: true,
      temporaryImageUrl: "https://example.com/bad.png",
      temporaryImageBase64: null,
      meta: {
        provider: "openai",
        model: "dall-e-3",
        capability: "image_generation",
        requestId: null,
        usage: null,
      },
    });
    moderate.mockResolvedValue({
      ok: true,
      flagged: true,
      categories: ["violence"],
      meta: {
        provider: "openai",
        model: "omni-moderation-latest",
        capability: "moderation",
        requestId: null,
        usage: null,
      },
    });

    const result = await generateProductAiImageDraft({ prompt: "x" });
    expect(result).toMatchObject({ ok: false, code: "moderation_blocked" });
  });
});
