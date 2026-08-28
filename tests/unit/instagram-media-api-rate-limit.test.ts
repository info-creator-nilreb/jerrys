import { afterEach, describe, expect, it } from "vitest";
import {
  __resetInstagramMediaApiRateLimitForTests,
  touchInstagramMediaApiAttempt,
} from "@/lib/security/instagram-media-api-rate-limit";

afterEach(() => {
  __resetInstagramMediaApiRateLimitForTests();
});

describe("touchInstagramMediaApiAttempt", () => {
  it("blockiert nach 120 Versuchen im Fenster", () => {
    for (let i = 0; i < 120; i++) {
      expect(touchInstagramMediaApiAttempt("203.0.113.80").ok).toBe(true);
    }
    const r = touchInstagramMediaApiAttempt("203.0.113.80");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThan(0);
  });
});
