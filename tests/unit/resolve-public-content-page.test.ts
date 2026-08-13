import { beforeEach, describe, expect, it, vi } from "vitest";

const getBySlug = vi.fn();
const getByPrevious = vi.fn();

vi.mock("@/lib/content/content-pages", () => ({
  getPublishedContentPageBySlug: (...args: unknown[]) => getBySlug(...args),
  getPublishedContentPageByPreviousSlug: (...args: unknown[]) =>
    getByPrevious(...args),
}));

import { resolvePublicContentPage } from "@/lib/content/resolve-public-content-page";

function page(partial: {
  slug: string;
  pageType?: "homepage" | "content" | "legal";
}) {
  return {
    id: "p1",
    slug: partial.slug,
    pageType: partial.pageType ?? "content",
    status: "published" as const,
    title: "T",
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    canonicalPath: null,
    robotsIndex: true,
    showInFooter: false,
    previousSlug: null,
    publishedAt: new Date(),
    updatedAt: new Date(),
    blocks: [],
  };
}

describe("resolvePublicContentPage", () => {
  beforeEach(() => {
    getBySlug.mockReset();
    getByPrevious.mockReset();
  });

  it("liefert published Content-Seite", async () => {
    getBySlug.mockResolvedValue(page({ slug: "ueber-uns" }));
    const r = await resolvePublicContentPage(["ueber-uns"]);
    expect(r).toEqual({ kind: "page", page: expect.objectContaining({ slug: "ueber-uns" }) });
    expect(getByPrevious).not.toHaveBeenCalled();
  });

  it("leitet /home und homepage-Typ auf / um", async () => {
    expect(await resolvePublicContentPage("home")).toEqual({
      kind: "redirect",
      toPath: "/",
    });

    getBySlug.mockResolvedValue(page({ slug: "home", pageType: "homepage" }));
    // home short-circuits before DB — still:
    expect(await resolvePublicContentPage(["home"])).toEqual({
      kind: "redirect",
      toPath: "/",
    });
  });

  it("lehnt reservierte Systempfade ab", async () => {
    expect(await resolvePublicContentPage(["produkte"])).toEqual({
      kind: "not_found",
    });
    expect(await resolvePublicContentPage(["vorschau", "inhalte"])).toEqual({
      kind: "not_found",
    });
    expect(getBySlug).not.toHaveBeenCalled();
  });

  it("redirectet von previousSlug auf aktuellen Pfad", async () => {
    getBySlug.mockResolvedValue(null);
    getByPrevious.mockResolvedValue(page({ slug: "neu-name" }));
    const r = await resolvePublicContentPage("alter-name");
    expect(r).toEqual({ kind: "redirect", toPath: "/neu-name" });
  });

  it("Drafts / unbekannte Pfade → not_found", async () => {
    getBySlug.mockResolvedValue(null);
    getByPrevious.mockResolvedValue(null);
    expect(await resolvePublicContentPage("fehlt")).toEqual({ kind: "not_found" });
  });
});
