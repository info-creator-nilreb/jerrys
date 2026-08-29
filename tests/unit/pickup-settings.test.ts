import { describe, expect, it } from "vitest";
import {
  DEFAULT_PICKUP_READY_TEXT,
  resolvePickupDisplayCopy,
} from "@/lib/shop/pickup-settings";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";

describe("resolvePickupDisplayCopy", () => {
  it("nutzt Stadt aus Shop-Adresse als Default-Standort", () => {
    const copy = resolvePickupDisplayCopy({
      ...JERRYS_SHOP_SETTINGS_DEFAULTS,
      id: "default",
      updatedAt: null,
      pickupStoreLabel: null,
    });
    expect(copy.storeLabel).toBe("Store in Berlin");
    expect(copy.readyText).toBe(DEFAULT_PICKUP_READY_TEXT);
  });

  it("respektiert explizite Shop-Texte", () => {
    const copy = resolvePickupDisplayCopy({
      ...JERRYS_SHOP_SETTINGS_DEFAULTS,
      id: "default",
      updatedAt: null,
      pickupStoreLabel: "Flagship Store Hamburg",
      pickupReadyText: "Meist am selben Tag",
      pickupInfoUrl: "/kontakt",
    });
    expect(copy.storeLabel).toBe("Flagship Store Hamburg");
    expect(copy.readyText).toBe("Meist am selben Tag");
    expect(copy.infoUrl).toBe("/kontakt");
  });
});
