/**
 * Schutz des öffentlichen PayPal-Webhook-Endpunkts.
 * PayPal kann retries senden — moderates Fenster.
 */

import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 120;

const limiter = createSlidingWindowIpRateLimiter(WINDOW_MS, MAX_ATTEMPTS);

export type PayPalWebhookRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function touchPayPalWebhookApiAttempt(clientKey: string): PayPalWebhookRateLimitResult {
  return limiter.touch(clientKey);
}

export function payPalWebhookRateLimitJsonHeaders(retryAfterSec: number): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(retryAfterSec),
  };
}

export function __resetPayPalWebhookApiRateLimitForTests(): void {
  limiter.resetForTests();
}
