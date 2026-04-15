import { afterEach, describe, expect, it } from "vitest";
import {
  __resetCredentialSignInRateLimitForTests,
  touchCredentialSignInAttempt,
} from "@/lib/security/sign-in-rate-limit";

afterEach(() => {
  __resetCredentialSignInRateLimitForTests();
});

describe("touchCredentialSignInAttempt", () => {
  it("erlaubt Versuche unter dem Limit", () => {
    for (let i = 0; i < 24; i++) {
      expect(touchCredentialSignInAttempt("1.2.3.4")).toEqual({ ok: true });
    }
    expect(touchCredentialSignInAttempt("1.2.3.4")).toEqual({ ok: true });
  });

  it("blockiert nach MAX Versuchen im Fenster", () => {
    for (let i = 0; i < 25; i++) {
      expect(touchCredentialSignInAttempt("5.6.7.8").ok).toBe(true);
    }
    const r = touchCredentialSignInAttempt("5.6.7.8");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.retryAfterSec).toBeGreaterThanOrEqual(1);
      expect(r.retryAfterSec).toBeLessThanOrEqual(15 * 60 + 5);
    }
  });

  it("trennt Clients", () => {
    for (let i = 0; i < 25; i++) {
      touchCredentialSignInAttempt("a");
    }
    expect(touchCredentialSignInAttempt("a").ok).toBe(false);
    expect(touchCredentialSignInAttempt("b").ok).toBe(true);
  });
});
