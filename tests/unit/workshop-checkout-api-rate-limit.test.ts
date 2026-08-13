import { afterEach, describe, expect, it } from "vitest";
import {
  __resetWorkshopCheckoutApiRateLimitForTests,
  touchWorkshopCheckoutApiAttempt,
} from "@/lib/security/workshop-checkout-api-rate-limit";

afterEach(() => {
  __resetWorkshopCheckoutApiRateLimitForTests();
});

describe("touchWorkshopCheckoutApiAttempt", () => {
  it("blockiert nach 30 Versuchen im Fenster", () => {
    for (let i = 0; i < 30; i++) {
      expect(touchWorkshopCheckoutApiAttempt("203.0.113.50").ok).toBe(true);
    }
    const r = touchWorkshopCheckoutApiAttempt("203.0.113.50");
    expect(r.ok).toBe(false);
  });
});
