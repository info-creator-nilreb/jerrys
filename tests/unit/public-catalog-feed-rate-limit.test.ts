import { afterEach, describe, expect, it } from "vitest";
import {
  __resetPublicCatalogFeedRateLimitForTests,
  touchPublicCatalogFeedAttempt,
} from "@/lib/security/public-catalog-feed-rate-limit";

afterEach(() => {
  __resetPublicCatalogFeedRateLimitForTests();
});

describe("touchPublicCatalogFeedAttempt", () => {
  it("blockiert nach 30 Versuchen im Fenster", () => {
    for (let i = 0; i < 30; i++) {
      expect(touchPublicCatalogFeedAttempt("203.0.113.50").ok).toBe(true);
    }
    const r = touchPublicCatalogFeedAttempt("203.0.113.50");
    expect(r.ok).toBe(false);
  });
});
