/**
 * Einfaches In-Memory-Rate-Limit für Admin-Credential-Login (Epic 10).
 * Pro Server-Instanz / Prozess; bei Serverless mehrere Buckets möglich — trotzdem wirksam pro warmem Worker.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 25;

const attempts = new Map<string, number[]>();

function prune(key: string, now: number): number[] {
  const arr = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, arr);
  return arr;
}

export type SignInRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * @param clientKey z. B. Client-IP (aus Forwarded-For / Real-IP)
 */
export function touchCredentialSignInAttempt(clientKey: string): SignInRateLimitResult {
  const now = Date.now();
  const key = clientKey.trim() || "unknown";
  const arr = prune(key, now);
  if (arr.length >= MAX_ATTEMPTS) {
    const oldest = arr[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec };
  }
  arr.push(now);
  attempts.set(key, arr);
  return { ok: true };
}

export function credentialSignInRateLimitHeaders(retryAfterSec: number): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(retryAfterSec),
  };
}

/** Nur für Tests. */
export function __resetCredentialSignInRateLimitForTests(): void {
  attempts.clear();
}
