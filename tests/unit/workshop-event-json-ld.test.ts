import { afterEach, describe, expect, it, vi } from "vitest";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import { applePayStoreLabel } from "@/lib/shop/storefront-branding";
import { buildWorkshopEventJsonLd } from "@/lib/site/structured-data";

describe("applePayStoreLabel", () => {
  it("normalisiert Shop-Namen zu ASCII", () => {
    expect(
      applePayStoreLabel({ shopName: "jerry's" }),
    ).toBe("jerrys");
    expect(
      applePayStoreLabel({ shopName: "Möbel & Co." }),
    ).toBe("MobelCo");
  });
});

describe("buildWorkshopEventJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("baut Event mit Offer und Organizer", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.test");
    const startsAt = new Date("2026-09-01T18:00:00.000Z");
    const endsAt = new Date("2026-09-01T20:00:00.000Z");
    const node = buildWorkshopEventJsonLd({
      name: "Workshop Abend",
      description: "Gemeinsam bauen",
      sessionId: "sess_1",
      startsAt,
      endsAt,
      timezone: "Europe/Berlin",
      locationLabel: "Werkstatt",
      locationLine1: "Musterstraße 1",
      locationLine2: null,
      locationZip: "10115",
      locationCity: "Berlin",
      locationCountry: "DE",
      priceCentsPerSeat: 4900,
      currency: "EUR",
      seatsRemaining: 3,
      shopName: JERRYS_SHOP_SETTINGS_DEFAULTS.shopName,
    });

    expect(node["@type"]).toBe("Event");
    expect(node.url).toBe("https://shop.test/termine/sess_1");
    expect(node.offers).toMatchObject({
      price: "49.00",
      priceCurrency: "EUR",
    });
    expect(node.organizer).toMatchObject({
      "@id": "https://shop.test/#organization",
    });
  });
});
