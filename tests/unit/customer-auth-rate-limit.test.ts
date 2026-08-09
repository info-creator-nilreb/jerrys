import { afterEach, describe, expect, it } from "vitest";
import {
  __resetCustomerAuthRateLimitsForTests,
  touchCustomerLoginAttempt,
  touchCustomerMagicLinkAttempt,
  touchCustomerRegisterAttempt,
} from "@/lib/security/customer-auth-rate-limit";

afterEach(() => {
  __resetCustomerAuthRateLimitsForTests();
});

describe("customer auth rate limits", () => {
  it("limitiert Registrierung", () => {
    for (let i = 0; i < 10; i++) {
      expect(touchCustomerRegisterAttempt("10.0.0.1").ok).toBe(true);
    }
    expect(touchCustomerRegisterAttempt("10.0.0.1").ok).toBe(false);
    expect(touchCustomerRegisterAttempt("10.0.0.2").ok).toBe(true);
  });

  it("limitiert Magic Link und Login getrennt", () => {
    for (let i = 0; i < 10; i++) {
      expect(touchCustomerMagicLinkAttempt("a").ok).toBe(true);
    }
    expect(touchCustomerMagicLinkAttempt("a").ok).toBe(false);
    expect(touchCustomerLoginAttempt("a").ok).toBe(true);
  });
});
