import { afterEach, describe, expect, it } from "vitest";
import {
  __resetAdminAccountRateLimitsForTests,
  touchAdminMfaChallengeAttempt,
  touchAdminMfaSetupAttempt,
  touchAdminPasswordChangeAttempt,
} from "@/lib/security/admin-account-rate-limit";

afterEach(() => {
  __resetAdminAccountRateLimitsForTests();
});

describe("admin account rate limits", () => {
  it("limitiert Passwortwechsel", () => {
    for (let i = 0; i < 10; i++) {
      expect(touchAdminPasswordChangeAttempt("10.0.0.1").ok).toBe(true);
    }
    expect(touchAdminPasswordChangeAttempt("10.0.0.1").ok).toBe(false);
    expect(touchAdminPasswordChangeAttempt("10.0.0.2").ok).toBe(true);
  });

  it("trennt Setup und Challenge", () => {
    for (let i = 0; i < 10; i++) {
      expect(touchAdminMfaSetupAttempt("a").ok).toBe(true);
    }
    expect(touchAdminMfaSetupAttempt("a").ok).toBe(false);
    expect(touchAdminMfaChallengeAttempt("a").ok).toBe(true);
  });
});
