import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STATIC_SITEMAP_PATHS,
  buildProductSitemapEntries,
  buildStaticSitemapEntries,
} from "@/lib/site/sitemap-entries";

describe("sitemap entries", () => {
  beforeEach(() => {
    vi.resetModules();
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
});
