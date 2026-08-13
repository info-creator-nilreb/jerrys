/**
 * Schutz der öffentlichen Storefront-Suggest-API vor Missbrauch.
 * Debounced Typeahead: moderates Kontingent pro IP und Minute.
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 60 * 1000;
/** Enger als früher (90): Typeahead bleibt nutzbar, Burst/Abuse trifft früher 429 (SEC-02). */
const MAX_ATTEMPTS = 35;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type StorefrontSearchApiRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function touchStorefrontSearchApiAttempt(
  clientKey: string,
): StorefrontSearchApiRateLimitResult {
  return limiter.touch(clientKey);
}

export function storefrontSearchApiRateLimitJsonHeaders(
  retryAfterSec: number,
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetStorefrontSearchApiRateLimitForTests(): void {
  limiter.resetForTests();
}
