import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STATIC_SITEMAP_PATHS,
  buildContentPageSitemapEntries,
  buildProductSitemapEntries,
  buildStaticSitemapEntries,
} from "@/lib/site/sitemap-entries";

const listPublished = vi.hoisted(() => vi.fn());

vi.mock("@/lib/content/content-public-discovery", () => ({
  listPublishedContentPagesForDiscovery: listPublished,
}));

describe("sitemap entries", () => {
  beforeEach(() => {
    vi.resetModules();
    listPublished.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes all static storefront paths", () => {
    const entries = buildStaticSitemapEntries("https://shop.example");
    expect(entries).toHaveLength(STATIC_SITEMAP_PATHS.length);
    expect(entries[0]?.url).toBe("https://shop.example/");
    expect(entries.some((e) => e.url.endsWith("/produkte"))).toBe(true);
  });

  it("returns no product URLs when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const entries = await buildProductSitemapEntries("https://shop.example");
    expect(entries).toEqual([]);
  });

  it("returns no product URLs during next production build phase", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const entries = await buildProductSitemapEntries("https://shop.example");
    expect(entries).toEqual([]);
  });

  it("nimmt nur Discovery-Ergebnisse (published) und überspringt Static-Pfade", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
    vi.stubEnv("NEXT_PHASE", "");
    listPublished.mockResolvedValue([
      {
        id: "1",
        slug: "ueber-uns",
        pageType: "content",
        title: "Über uns",
        path: "/ueber-uns",
        robotsIndex: true,
        showInFooter: false,
        updatedAt: new Date("2026-08-11T00:00:00.000Z"),
        publishedAt: new Date("2026-08-11T00:00:00.000Z"),
      },
      {
        id: "2",
        slug: "impressum",
        pageType: "legal",
        title: "Impressum",
        path: "/impressum",
        robotsIndex: true,
        showInFooter: false,
        updatedAt: new Date("2026-08-11T00:00:00.000Z"),
        publishedAt: new Date("2026-08-11T00:00:00.000Z"),
      },
    ]);

    const entries = await buildContentPageSitemapEntries("https://shop.example");
    expect(listPublished).toHaveBeenCalledWith({ robotsIndexOnly: true });
    expect(entries.map((e) => e.url)).toEqual(["https://shop.example/ueber-uns"]);
  });
});
