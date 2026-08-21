import { describe, expect, it } from "vitest";
import {
  INTERNETMARKE_SHOP_ORDER_ID_MAX,
  buildInternetmarkeShopOrderId,
  sanitizeInternetmarkeShopOrderId,
} from "@/features/fulfillment/domain/internetmarke-shop-order-id";

describe("sanitizeInternetmarkeShopOrderId", () => {
  it("entfernt unzulässige Zeichen und begrenzt auf 18", () => {
    const raw = "JR-<ABC&123456789012345678";
    const sanitized = sanitizeInternetmarkeShopOrderId(raw);
    expect(sanitized).toBe("JR-ABC123456789012");
    expect(sanitized.length).toBeLessThanOrEqual(INTERNETMARKE_SHOP_ORDER_ID_MAX);
  });
});

describe("buildInternetmarkeShopOrderId", () => {
  it("bleibt stabil und ≤18 Zeichen für dieselbe Sendung", () => {
    const input = { shipmentId: "clshipment123456789", orderNumber: "JR-A1B2C3" };
    const a = buildInternetmarkeShopOrderId(input);
    const b = buildInternetmarkeShopOrderId(input);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a.length).toBeLessThanOrEqual(INTERNETMARKE_SHOP_ORDER_ID_MAX);
    expect(a).toMatch(/^JR-A1B2C3-[0-9a-f]{6}$/);
  });

  it("unterscheidet Sendungen derselben Bestellung", () => {
    const orderNumber = "JR-A1B2C3";
    const a = buildInternetmarkeShopOrderId({
      shipmentId: "shipment-a",
      orderNumber,
    });
    const b = buildInternetmarkeShopOrderId({
      shipmentId: "shipment-b",
      orderNumber,
    });
    expect(a).not.toBe(b);
  });

  it("fällt bei leerer Bestellnummer auf Hash zurück", () => {
    const id = buildInternetmarkeShopOrderId({
      shipmentId: "shipment-only",
      orderNumber: "   ",
    });
    expect(id.length).toBe(INTERNETMARKE_SHOP_ORDER_ID_MAX);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });
});
