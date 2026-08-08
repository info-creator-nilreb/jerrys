import { afterEach, describe, expect, it } from "vitest";
import {
  __resetPayPalWebhookApiRateLimitForTests,
  touchPayPalWebhookApiAttempt,
} from "@/lib/security/paypal-webhook-api-rate-limit";

afterEach(() => {
  __resetPayPalWebhookApiRateLimitForTests();
});

describe("touchPayPalWebhookApiAttempt", () => {
  it("blockiert nach 120 Versuchen im Fenster", () => {
    for (let i = 0; i < 120; i++) {
      expect(touchPayPalWebhookApiAttempt("203.0.113.50").ok).toBe(true);
    }
    const r = touchPayPalWebhookApiAttempt("203.0.113.50");
    expect(r.ok).toBe(false);
  });
});
