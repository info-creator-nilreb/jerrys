/**
 * In-Memory-Rate-Limits für Admin-Konto (Passwort, MFA-Setup, MFA-Login).
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

const passwordChangeLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);
const mfaSetupLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);
const mfaChallengeLimiter = createSlidingWindowIpRateLimiter(WINDOW_MS, 10);

export type AdminAccountRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function touchAdminPasswordChangeAttempt(
  clientKey: string,
): AdminAccountRateLimitResult {
  return passwordChangeLimiter.touch(clientKey);
}

export function touchAdminMfaSetupAttempt(clientKey: string): AdminAccountRateLimitResult {
  return mfaSetupLimiter.touch(clientKey);
}

export function touchAdminMfaChallengeAttempt(
  clientKey: string,
): AdminAccountRateLimitResult {
  return mfaChallengeLimiter.touch(clientKey);
}

export function __resetAdminAccountRateLimitsForTests(): void {
  passwordChangeLimiter.resetForTests();
  mfaSetupLimiter.resetForTests();
  mfaChallengeLimiter.resetForTests();
}
