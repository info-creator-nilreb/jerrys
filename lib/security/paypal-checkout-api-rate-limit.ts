/**
 * Schutz öffentlicher PayPal-Checkout-APIs vor Missbrauch (Epic 10).
 * Fenster 10 Min., moderates Kontingent pro IP (inkl. Retries im Checkout).
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 80;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type PayPalApiRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function touchPayPalCheckoutApiAttempt(clientKey: string): PayPalApiRateLimitResult {
  return limiter.touch(clientKey);
}

export function payPalApiRateLimitJsonHeaders(retryAfterSec: number): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetPayPalCheckoutApiRateLimitForTests(): void {
  limiter.resetForTests();
}
