import { describe, expect, it } from "vitest";
import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

describe("createSlidingWindowIpRateLimiter", () => {
  it("respektiert maxAttempts im Fenster", () => {
    const { touch, resetForTests } = createSlidingWindowIpRateLimiter(60_000, 3);
    expect(touch("ip-a").ok).toBe(true);
    expect(touch("ip-a").ok).toBe(true);
    expect(touch("ip-a").ok).toBe(true);
    const blocked = touch("ip-a");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    resetForTests();
  });

  it("trennt Schlüssel", () => {
    const { touch, resetForTests } = createSlidingWindowIpRateLimiter(60_000, 1);
    expect(touch("a").ok).toBe(true);
    expect(touch("a").ok).toBe(false);
    expect(touch("b").ok).toBe(true);
    resetForTests();
  });
});
