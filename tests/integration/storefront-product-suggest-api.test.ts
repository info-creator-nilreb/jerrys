import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { __resetStorefrontSearchApiRateLimitForTests } from "@/lib/security/storefront-search-api-rate-limit";

afterEach(() => {
  __resetStorefrontSearchApiRateLimitForTests();
});

describe("GET /api/storefront/product-suggest", () => {
  it("liefert leere Vorschläge bei zu kurzer Query ohne DB", async () => {
    const { GET } = await import("@/app/api/storefront/product-suggest/route");
    const req = new NextRequest("http://127.0.0.1/api/storefront/product-suggest?q=a");
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ suggestions: [] });
  });

  it("liefert leere Vorschläge ohne q", async () => {
    const { GET } = await import("@/app/api/storefront/product-suggest/route");
    const req = new NextRequest("http://127.0.0.1/api/storefront/product-suggest");
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ suggestions: [] });
  });
});
