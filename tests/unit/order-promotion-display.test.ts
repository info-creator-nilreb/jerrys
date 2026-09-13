import { describe, expect, it } from "vitest";
import {
  buildOrderPromotionDisplay,
  orderHasPromotionApplied,
  orderPromotionListLabel,
} from "@/lib/orders/order-promotion-display";

describe("orderHasPromotionApplied", () => {
  it("erkennt Warenrabatt", () => {
    expect(orderHasPromotionApplied({ discountOffSubtotalCents: 500 })).toBe(true);
  });

  it("erkennt Versand-Promotion ohne Warenrabatt", () => {
    expect(
      orderHasPromotionApplied({
        discountOffSubtotalCents: 0,
        promotionTitleSnapshot: "Sommer gratis Versand",
      }),
    ).toBe(true);
  });

  it("lehnt Bestellung ohne Promotion ab", () => {
    expect(orderHasPromotionApplied({ discountOffSubtotalCents: 0 })).toBe(false);
  });
});

describe("orderPromotionListLabel", () => {
  it("bevorzugt Promotion-Titel", () => {
    expect(
      orderPromotionListLabel({
        discountOffSubtotalCents: 200,
        promotionTitleSnapshot: "10 % Sommer",
      }),
    ).toBe("10 % Sommer");
  });

  it("fällt auf Rabatt zurück", () => {
    expect(
      orderPromotionListLabel({
        discountOffSubtotalCents: 200,
      }),
    ).toBe("Rabatt");
  });
});

describe("buildOrderPromotionDisplay", () => {
  it("berechnet Katalog-Zwischensumme vor Rabatt", () => {
    const display = buildOrderPromotionDisplay({
      subtotalGrossCents: 4500,
      discountOffSubtotalCents: 500,
      promotionTitleSnapshot: "10 % Rabatt",
      promotionCodeSnapshot: "SOMMER10",
    });
    expect(display.catalogSubtotalBeforeDiscountCents).toBe(5000);
    expect(display.label).toBe("10 % Rabatt");
    expect(display.detail).toBe("Code: SOMMER10");
    expect(display.hasPromotion).toBe(true);
  });

  it("kennzeichnet automatische Promotion", () => {
    const display = buildOrderPromotionDisplay({
      subtotalGrossCents: 2000,
      discountOffSubtotalCents: 0,
      promotionId: "promo_1",
      promotionTitleSnapshot: "Gratis Versand",
      promotionType: "free_shipping",
    });
    expect(display.promotionType).toBe("free_shipping");
    expect(display.detail).toBe("Automatisch");
  });
});
