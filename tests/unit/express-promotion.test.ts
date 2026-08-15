import { describe, expect, it } from "vitest";
import { parseExpressDeliveryMethod, parseExpressPromotionInput } from "@/lib/checkout/express-promotion";

describe("parseExpressPromotionInput", () => {
  it("liest Code und Ablehnung aus Checkout-Feldern", () => {
    expect(
      parseExpressPromotionInput({
        checkoutPromotionCode: "  sommer10 ",
        checkoutDeclineAutomatic: "1",
      }),
    ).toEqual({ promotionCode: "SOMMER10", declineAutomatic: true });
  });

  it("akzeptiert boolean declineAutomatic", () => {
    expect(
      parseExpressPromotionInput({
        promotionCode: "ABC",
        declineAutomatic: true,
      }),
    ).toEqual({ promotionCode: "ABC", declineAutomatic: true });
  });

  it("liefert leeren Code ohne Ablehnung als Default", () => {
    expect(parseExpressPromotionInput({})).toEqual({
      promotionCode: "",
      declineAutomatic: false,
    });
  });
});

describe("parseExpressDeliveryMethod", () => {
  it("übernimmt Abholung aus dem Express-Request", () => {
    expect(parseExpressDeliveryMethod({ deliveryMethod: "pickup" })).toBe("pickup");
    expect(parseExpressDeliveryMethod({ checkoutDeliveryMethod: "pickup" })).toBe("pickup");
  });

  it("fällt ohne Angabe auf Versand zurück", () => {
    expect(parseExpressDeliveryMethod({})).toBe("shipping");
    expect(parseExpressDeliveryMethod({ deliveryMethod: "on" })).toBe("shipping");
  });
});
