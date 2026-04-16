export type SlidingWindowRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Gleitendes Fenster pro Schlüssel (typ. Client-IP). In-Memory pro Prozess.
 */
export function createSlidingWindowIpRateLimiter(windowMs: number, maxAttempts: number) {
  const attempts = new Map<string, number[]>();

  function prune(key: string, now: number): number[] {
    const arr = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
    attempts.set(key, arr);
    return arr;
  }

  function touch(clientKey: string): SlidingWindowRateLimitResult {
    const now = Date.now();
    const key = clientKey.trim() || "unknown";
    const arr = prune(key, now);
    if (arr.length >= maxAttempts) {
      const oldest = arr[0]!;
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { ok: false, retryAfterSec };
    }
    arr.push(now);
    attempts.set(key, arr);
    return { ok: true };
  }

  function resetForTests(): void {
    attempts.clear();
  }

  return { touch, resetForTests };
}
