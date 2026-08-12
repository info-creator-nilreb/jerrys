/**
 * Schutz des öffentlichen Produktfeeds vor aggressivem Polling.
 * Crawler sollen ETag/Cache nutzen; moderates Kontingent pro IP und Minute.
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 30;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type PublicCatalogFeedRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function touchPublicCatalogFeedAttempt(
  clientKey: string,
): PublicCatalogFeedRateLimitResult {
  return limiter.touch(clientKey);
}

export function publicCatalogFeedRateLimitHeaders(
  retryAfterSec: number,
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetPublicCatalogFeedRateLimitForTests(): void {
  limiter.resetForTests();
}
