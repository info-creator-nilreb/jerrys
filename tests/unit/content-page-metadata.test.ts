import { describe, expect, it } from "vitest";
import { metadataForContentPage } from "@/lib/content/content-page-metadata";
import type { ContentPageDTO } from "@/lib/content/content-pages";

function base(over: Partial<ContentPageDTO> = {}): ContentPageDTO {
  return {
    id: "1",
    slug: "ueber-uns",
    pageType: "content",
    status: "published",
    title: "Über uns",
    seoTitle: "SEO Titel",
    seoDescription: "Desc",
    ogImageUrl: "/branding/og.png",
    canonicalPath: null,
    robotsIndex: true,
    previousSlug: null,
    publishedAt: new Date(),
    updatedAt: new Date(),
    blocks: [],
    ...over,
  };
}

describe("metadataForContentPage", () => {
  it("setzt SEO-Felder und Canonical aus Slug", () => {
    const m = metadataForContentPage(base());
    expect(m.title).toBe("SEO Titel");
    expect(m.description).toBe("Desc");
    expect(m.alternates).toEqual({ canonical: "/ueber-uns" });
    expect(m.robots).toEqual({ index: true, follow: true });
  });

  it("respektiert robotsIndex false und Canonical-Override", () => {
    const m = metadataForContentPage(
      base({ robotsIndex: false, canonicalPath: "/custom", seoTitle: null }),
    );
    expect(m.title).toBe("Über uns");
    expect(m.alternates).toEqual({ canonical: "/custom" });
    expect(m.robots).toEqual({ index: false, follow: false });
  });
});
