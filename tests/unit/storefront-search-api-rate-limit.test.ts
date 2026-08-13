import { afterEach, describe, expect, it } from "vitest";
import {
  __resetStorefrontSearchApiRateLimitForTests,
  touchStorefrontSearchApiAttempt,
} from "@/lib/security/storefront-search-api-rate-limit";

afterEach(() => {
  __resetStorefrontSearchApiRateLimitForTests();
});

describe("touchStorefrontSearchApiAttempt", () => {
  it("blockiert nach 35 Versuchen im Fenster", () => {
    for (let i = 0; i < 35; i++) {
      expect(touchStorefrontSearchApiAttempt("203.0.113.40").ok).toBe(true);
    }
    const r = touchStorefrontSearchApiAttempt("203.0.113.40");
    expect(r.ok).toBe(false);
  });
});
