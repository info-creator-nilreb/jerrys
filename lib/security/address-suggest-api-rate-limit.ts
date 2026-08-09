import { createSlidingWindowIpRateLimiter } from "@/lib/security/sliding-window-ip-rate-limit";

/** Typeahead: viele Requests pro Formular, aber kein Missbrauch als Adress-Proxy. */
const limiter = createSlidingWindowIpRateLimiter(60_000, 120);

export function touchAddressSuggestApiAttempt(clientKey: string) {
  return limiter.touch(clientKey);
}

export function addressSuggestRateLimitHeaders(retryAfterSec: number): Record<string, string> {
  return { "Retry-After": String(retryAfterSec) };
}

export function __resetAddressSuggestRateLimitForTests(): void {
  limiter.resetForTests();
}
