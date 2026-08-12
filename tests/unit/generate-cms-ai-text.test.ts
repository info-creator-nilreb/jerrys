import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();
const createAiContentPort = vi.fn();

vi.mock("@/features/integrations/application/create-ai-content-port", () => ({
  createAiContentPort: (...args: unknown[]) => createAiContentPort(...args),
}));

import {
  cmsAiKindForBlock,
  cmsFieldForAiTextKind,
  generateCmsAiTextDraft,
} from "@/features/integrations/application/generate-cms-ai-text";

describe("cmsAiKindForBlock / cmsFieldForAiTextKind", () => {
  it("mappt Hero und RichText auf Textarten und Zielfelder", () => {
    expect(cmsAiKindForBlock("hero")).toBe("cms_hero_headline");
    expect(cmsAiKindForBlock("richText")).toBe("cms_rich_text");
    expect(cmsFieldForAiTextKind("cms_hero_headline")).toBe("headline");
    expect(cmsFieldForAiTextKind("cms_rich_text")).toBe("html");
    expect(cmsFieldForAiTextKind("short_description")).toBeNull();
  });
});

describe("generateCmsAiTextDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAiContentPort.mockResolvedValue({
      isConfigured: () => true,
      supports: (c: string) => c === "text",
      generateText,
    });
  });

  it("lehnt verbotene Prompt-Fakten ab", async () => {
    const result = await generateCmsAiTextDraft({
      blockType: "hero",
      facts: {
        pageTitle: "Start",
        customerEmail: "a@b.de",
      } as Record<string, unknown>,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_request");
      expect(result.error).toMatch(/personenbezogen|geheim/i);
    }
    expect(generateText).not.toHaveBeenCalled();
  });

  it("liefert Hero-Entwurf ohne Persistenz und mappt auf headline", async () => {
    generateText.mockResolvedValue({
      ok: true,
      draftText: "Willkommen bei jerry's",
      meta: {
        provider: "openai",
        model: "gpt-test",
        capability: "text",
        requestId: null,
        usage: null,
      },
    });

    const result = await generateCmsAiTextDraft({
      blockType: "hero",
      facts: { pageTitle: "Startseite", existingHeadline: "Alt" },
    });

    expect(result).toMatchObject({
      ok: true,
      kind: "cms_hero_headline",
      targetField: "headline",
      applyValue: "Willkommen bei jerry's",
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "cms_hero_headline",
        facts: expect.objectContaining({
          pageTitle: "Startseite",
          blockType: "hero",
        }),
      }),
    );
  });

  it("wandelt RichText-Entwurf in HTML um", async () => {
    generateText.mockResolvedValue({
      ok: true,
      draftText: "Absatz eins.\n\nAbsatz zwei.",
      meta: {
        provider: "openai",
        model: "gpt-test",
        capability: "text",
        requestId: null,
        usage: null,
      },
    });

    const result = await generateCmsAiTextDraft({
      blockType: "richText",
      facts: { pageTitle: "Über uns" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.targetField).toBe("html");
      expect(result.applyValue).toContain("<p>Absatz eins.</p>");
      expect(result.applyValue).toContain("<p>Absatz zwei.</p>");
    }
  });

  it("meldet not_configured wenn Port nicht bereit", async () => {
    createAiContentPort.mockResolvedValue({
      isConfigured: () => false,
      supports: () => false,
      generateText,
    });

    const result = await generateCmsAiTextDraft({
      blockType: "hero",
      facts: { pageTitle: "Start" },
    });

    expect(result).toMatchObject({ ok: false, code: "not_configured" });
    expect(generateText).not.toHaveBeenCalled();
  });
});
