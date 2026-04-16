/**
 * In-Memory-Rate-Limit für Admin-Credential-Login (Epic 10).
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 25;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type SignInRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function touchCredentialSignInAttempt(clientKey: string): SignInRateLimitResult {
  return limiter.touch(clientKey);
}

export function credentialSignInRateLimitHeaders(retryAfterSec: number): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetCredentialSignInRateLimitForTests(): void {
  limiter.resetForTests();
}
