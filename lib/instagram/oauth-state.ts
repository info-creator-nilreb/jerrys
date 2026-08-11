import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret";

const TTL_MS = 15 * 60 * 1000;

function sign(value: string): string {
  const secret = resolveAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET fehlt für Instagram-OAuth-State.");
  }
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Signierter OAuth-`state` (nonce.exp.sig). */
export function createInstagramOAuthState(): string {
  const nonce = randomBytes(16).toString("base64url");
  const exp = String(Date.now() + TTL_MS);
  const body = `${nonce}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyInstagramOAuthState(state: string | null | undefined): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, exp, sig] = parts;
  if (!nonce || !exp || !sig) return false;
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const body = `${nonce}.${exp}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
