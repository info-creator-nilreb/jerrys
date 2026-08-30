import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: () => {
    throw new Error("Invariant: incrementalCache missing in unstable_cache test");
  },
}));

describe("runStorefrontCatalogCache", () => {
  it("fällt ohne Next-Request-Kontext auf den Loader zurück", async () => {
    const { runStorefrontCatalogCache } = await import("@/lib/catalog/run-storefront-catalog-cache");
    const loader = vi.fn().mockResolvedValue(["product-a"]);

    const result = await runStorefrontCatalogCache(["storefront-test"], loader);

    expect(result).toEqual(["product-a"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
