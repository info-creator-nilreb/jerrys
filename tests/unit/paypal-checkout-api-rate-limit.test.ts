import { afterEach, describe, expect, it } from "vitest";
import {
  __resetPayPalCheckoutApiRateLimitForTests,
  touchPayPalCheckoutApiAttempt,
} from "@/lib/security/paypal-checkout-api-rate-limit";

afterEach(() => {
  __resetPayPalCheckoutApiRateLimitForTests();
});

describe("touchPayPalCheckoutApiAttempt", () => {
  it("blockiert nach 80 Versuchen im Fenster", () => {
    for (let i = 0; i < 80; i++) {
      expect(touchPayPalCheckoutApiAttempt("203.0.113.1").ok).toBe(true);
    }
    const r = touchPayPalCheckoutApiAttempt("203.0.113.1");
    expect(r.ok).toBe(false);
  });
});
