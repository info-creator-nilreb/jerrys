import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();
const createAiContentPort = vi.fn();

vi.mock("@/features/integrations/application/create-ai-content-port", () => ({
  createAiContentPort: (...args: unknown[]) => createAiContentPort(...args),
}));

import {
  cmsPageSeoFieldForKind,
  generateCmsPageSeoAiTextDraft,
  isCmsPageSeoAiKind,
} from "@/features/integrations/application/generate-cms-page-seo-ai-text";

describe("cms page SEO AI helpers", () => {
  it("mappt Kinds und erkennt gültige Werte", () => {
    expect(cmsPageSeoFieldForKind("seo_title")).toBe("seoTitle");
    expect(cmsPageSeoFieldForKind("seo_description")).toBe("seoDescription");
    expect(isCmsPageSeoAiKind("seo_title")).toBe(true);
    expect(isCmsPageSeoAiKind("cms_hero_headline")).toBe(false);
  });
});

describe("generateCmsPageSeoAiTextDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAiContentPort.mockResolvedValue({
      isConfigured: () => true,
      supports: (c: string) => c === "text",
      generateText,
    });
  });

  it("liefert SEO-Titel und kürzt auf Schema-Limit", async () => {
    generateText.mockResolvedValue({
      ok: true,
      draftText: "A".repeat(90),
      meta: {
        provider: "openai",
        model: "gpt-test",
        capability: "text",
        requestId: null,
        usage: null,
      },
    });

    const result = await generateCmsPageSeoAiTextDraft({
      kind: "seo_title",
      facts: { pageTitle: "Startseite", title: "Startseite" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.targetField).toBe("seoTitle");
    expect(result.applyValue.length).toBeLessThanOrEqual(70);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "seo_title" }),
    );
  });
});
