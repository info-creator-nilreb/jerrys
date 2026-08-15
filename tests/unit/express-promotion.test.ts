import { describe, expect, it } from "vitest";
import { parseExpressPromotionInput } from "@/lib/checkout/express-promotion";

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
