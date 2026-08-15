import { describe, expect, it } from "vitest";
import {
  checkoutSurfaceNeedsHostedRedirect,
  parseCheckoutPayPalSurface,
  parsePayPalVaultId,
} from "@/lib/checkout/checkout-paypal-surface";

describe("parseCheckoutPayPalSurface", () => {
  it("erkennt SEPA, Karte und Wallets", () => {
    expect(parseCheckoutPayPalSurface("sepa")).toBe("sepa");
    expect(parseCheckoutPayPalSurface("card")).toBe("card");
    expect(parseCheckoutPayPalSurface("apple_pay")).toBe("apple_pay");
    expect(parseCheckoutPayPalSurface("google_pay")).toBe("google_pay");
    expect(parseCheckoutPayPalSurface("paypal")).toBe("paypal");
  });

  it("fällt ohne Wert auf PayPal zurück — nicht auf SEPA", () => {
    expect(parseCheckoutPayPalSurface(undefined)).toBe("paypal");
    expect(parseCheckoutPayPalSurface("on")).toBe("paypal");
    expect(parseCheckoutPayPalSurface("")).toBe("paypal");
  });
});

describe("parsePayPalVaultId", () => {
  it("akzeptiert alphanumerische Token-IDs", () => {
    expect(parsePayPalVaultId("5dxd1")).toBe("5dxd1");
  });

  it("verwirft leer und ungültig", () => {
    expect(parsePayPalVaultId("")).toBeUndefined();
    expect(parsePayPalVaultId("   ")).toBeUndefined();
    expect(parsePayPalVaultId("id with space")).toBeUndefined();
  });
});

describe("checkoutSurfaceNeedsHostedRedirect", () => {
  it("gilt für PayPal-Konto und SEPA-Mandat, nicht für Karte oder Wallets", () => {
    expect(checkoutSurfaceNeedsHostedRedirect("paypal")).toBe(true);
    expect(checkoutSurfaceNeedsHostedRedirect("sepa")).toBe(true);
    expect(checkoutSurfaceNeedsHostedRedirect("card")).toBe(false);
    expect(checkoutSurfaceNeedsHostedRedirect("apple_pay")).toBe(false);
    expect(checkoutSurfaceNeedsHostedRedirect("google_pay")).toBe(false);
  });
});
