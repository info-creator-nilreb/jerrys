import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("robots.ts Crawler-Richtlinien", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("liefert Sitemap und Regeln für * sowie KI-Crawler", async () => {
    const { default: robots } = await import("@/app/robots");
    const r = robots();
    expect(r.sitemap).toBe("https://shop.test/sitemap.xml");
    expect(Array.isArray(r.rules)).toBe(true);
    const rules = r.rules as Array<{ userAgent: string; disallow?: string | string[] }>;
    const uas = rules.map((x) => x.userAgent);
    expect(uas).toContain("*");
    expect(uas).toContain("GPTBot");
    expect(uas).toContain("ClaudeBot");
    expect(uas).toContain("Google-Extended");
    expect(uas).toContain("PerplexityBot");
    expect(uas).toContain("CCBot");

    const star = rules.find((x) => x.userAgent === "*");
    expect(star?.disallow).toEqual(expect.arrayContaining(["/admin/", "/api/"]));

    const gpt = rules.find((x) => x.userAgent === "GPTBot");
    expect(gpt?.disallow).toEqual(star?.disallow);
  });
});
