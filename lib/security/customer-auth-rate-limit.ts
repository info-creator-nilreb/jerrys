/**
 * In-Memory-Rate-Limits für Kunden-Auth (Registrierung, Magic Link, Reset, Login).
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

const registerLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);
const magicLinkLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);
const passwordResetLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);
const passwordChangeLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);
const customerLoginLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 25);

export type CustomerAuthRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function touchCustomerRegisterAttempt(clientKey: string): CustomerAuthRateLimitResult {
  return registerLimiter.touch(clientKey);
}

export function touchCustomerMagicLinkAttempt(clientKey: string): CustomerAuthRateLimitResult {
  return magicLinkLimiter.touch(clientKey);
}

export function touchCustomerPasswordResetAttempt(clientKey: string): CustomerAuthRateLimitResult {
  return passwordResetLimiter.touch(clientKey);
}

export function touchCustomerPasswordChangeAttempt(clientKey: string): CustomerAuthRateLimitResult {
  return passwordChangeLimiter.touch(clientKey);
}

export function touchCustomerLoginAttempt(clientKey: string): CustomerAuthRateLimitResult {
  return customerLoginLimiter.touch(clientKey);
}

export function customerAuthRateLimitHeaders(retryAfterSec: number): Record<string, string> {
  return {
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetCustomerAuthRateLimitsForTests(): void {
  registerLimiter.resetForTests();
  magicLinkLimiter.resetForTests();
  passwordResetLimiter.resetForTests();
  passwordChangeLimiter.resetForTests();
  customerLoginLimiter.resetForTests();
}
