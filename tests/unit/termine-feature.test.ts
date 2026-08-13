import { beforeEach, describe, expect, it, vi } from "vitest";

const getShopSettings = vi.fn();

vi.mock("@/lib/shop/shop-settings", () => ({
  getShopSettings: () => getShopSettings(),
}));

describe("isTermineFeatureEnabled", () => {
  beforeEach(() => {
    getShopSettings.mockReset();
    vi.resetModules();
  });

  it("ist true wenn ShopSettings.showTermineInNav true", async () => {
    getShopSettings.mockResolvedValue({ showTermineInNav: true });
    const { isTermineFeatureEnabled } = await import("@/lib/shop/termine-feature");
    await expect(isTermineFeatureEnabled()).resolves.toBe(true);
  });

  it("ist false wenn ShopSettings.showTermineInNav false", async () => {
    getShopSettings.mockResolvedValue({ showTermineInNav: false });
    const { isTermineFeatureEnabled } = await import("@/lib/shop/termine-feature");
    await expect(isTermineFeatureEnabled()).resolves.toBe(false);
  });
});
