import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret";
import { absoluteUrl } from "@/lib/site/canonical-origin";

/** Kurzlebige Preview-Tokens (Epic 12 Slice 4). */
export const CONTENT_PREVIEW_TTL_SECONDS = 30 * 60;

const TOKEN_VERSION = "v1";

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeToString(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    return Buffer.from(padded + pad, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function previewSigningSecret(): string | null {
  const dedicated = process.env.CONTENT_PREVIEW_SECRET?.trim();
  if (dedicated) return dedicated;
  return resolveAuthSecret() ?? null;
}

function signPayload(payload: string, secret: string): string {
  return base64UrlEncode(
    createHmac("sha256", secret).update(payload, "utf8").digest(),
  );
}

function safeEqualHexLike(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type ContentPreviewTokenCreateResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: string };

/**
 * Signiertes Preview-Token: `v1.<base64url(pageId)>.<expUnix>.<hmac>`.
 * Kein DB-State; ungültige/abgelaufene Tokens → Verifikation fehlgeschlagen.
 */
export function createContentPreviewToken(
  pageId: string,
  options?: { now?: Date; ttlSeconds?: number },
): ContentPreviewTokenCreateResult {
  const id = pageId.trim();
  if (!id) return { ok: false, error: "pageId fehlt." };
  const secret = previewSigningSecret();
  if (!secret) {
    return { ok: false, error: "Preview-Secret nicht konfiguriert (AUTH_SECRET)." };
  }
  const now = options?.now ?? new Date();
  const ttl = options?.ttlSeconds ?? CONTENT_PREVIEW_TTL_SECONDS;
  const exp = Math.floor(now.getTime() / 1000) + ttl;
  const body = `${TOKEN_VERSION}.${base64UrlEncode(id)}.${exp}`;
  const sig = signPayload(body, secret);
  return {
    ok: true,
    token: `${body}.${sig}`,
    expiresAt: new Date(exp * 1000),
  };
}

export type ContentPreviewTokenVerifyResult =
  | { ok: true; pageId: string; expiresAt: Date }
  | { ok: false; reason: "malformed" | "expired" | "invalid_signature" | "no_secret" };

export function verifyContentPreviewToken(
  token: string,
  options?: { now?: Date; expectedPageId?: string },
): ContentPreviewTokenVerifyResult {
  const secret = previewSigningSecret();
  if (!secret) return { ok: false, reason: "no_secret" };

  const parts = token.trim().split(".");
  if (parts.length !== 4) return { ok: false, reason: "malformed" };
  const [version, idPart, expPart, sig] = parts;
  if (version !== TOKEN_VERSION || !idPart || !expPart || !sig) {
    return { ok: false, reason: "malformed" };
  }

  const exp = Number(expPart);
  if (!Number.isFinite(exp) || exp <= 0) {
    return { ok: false, reason: "malformed" };
  }

  const body = `${version}.${idPart}.${expPart}`;
  const expectedSig = signPayload(body, secret);
  if (!safeEqualHexLike(sig, expectedSig)) {
    return { ok: false, reason: "invalid_signature" };
  }

  const nowSec = Math.floor((options?.now ?? new Date()).getTime() / 1000);
  if (nowSec > exp) {
    return { ok: false, reason: "expired" };
  }

  const pageId = base64UrlDecodeToString(idPart);
  if (!pageId) return { ok: false, reason: "malformed" };

  if (options?.expectedPageId && options.expectedPageId !== pageId) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true, pageId, expiresAt: new Date(exp * 1000) };
}

/** Relativer Preview-Pfad inkl. Query. */
export function contentPreviewPath(pageId: string, token: string): string {
  const q = new URLSearchParams({ token });
  return `/vorschau/inhalte/${encodeURIComponent(pageId)}?${q.toString()}`;
}

export function contentPreviewAbsoluteUrl(
  pageId: string,
  options?: { now?: Date; ttlSeconds?: number },
): { ok: true; url: string; expiresAt: Date } | { ok: false; error: string } {
  const created = createContentPreviewToken(pageId, options);
  if (!created.ok) return created;
  return {
    ok: true,
    url: absoluteUrl(contentPreviewPath(pageId, created.token)),
    expiresAt: created.expiresAt,
  };
}
