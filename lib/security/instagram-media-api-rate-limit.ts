/**
 * Öffentlicher Instagram-Media-Proxy: viele Bilder pro Pageview, daher höheres Kontingent.
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 60 * 1000;
/** 24 Raster-Zellen + Reloads; Missbrauch trifft trotzdem 429. */
const MAX_ATTEMPTS = 120;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type InstagramMediaApiRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function touchInstagramMediaApiAttempt(
  clientKey: string,
): InstagramMediaApiRateLimitResult {
  return limiter.touch(clientKey);
}

export function instagramMediaApiRateLimitHeaders(
  retryAfterSec: number,
): Record<string, string> {
  return {
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetInstagramMediaApiRateLimitForTests(): void {
  limiter.resetForTests();
}
