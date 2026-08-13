/**
 * Schutz öffentlicher Workshop-Checkout-APIs (Seat-Hold / Complete) vor Spam.
 * Fenster 10 Min., knappes Kontingent pro IP (Holds sind teuer).
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type WorkshopCheckoutApiRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function touchWorkshopCheckoutApiAttempt(
  clientKey: string,
): WorkshopCheckoutApiRateLimitResult {
  return limiter.touch(clientKey);
}

export function workshopCheckoutApiRateLimitHeaders(
  retryAfterSec: number,
): Record<string, string> {
  return {
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetWorkshopCheckoutApiRateLimitForTests(): void {
  limiter.resetForTests();
}
