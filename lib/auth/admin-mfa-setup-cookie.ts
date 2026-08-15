import { decryptSecret, encryptSecret } from "@/lib/security/secret-crypto";

export const ADMIN_MFA_SETUP_COOKIE = "jerrys_admin_mfa_setup";
export const ADMIN_MFA_SETUP_TTL_MS = 10 * 60 * 1000;

export type AdminMfaSetupPayload = {
  secret: string;
  exp: number;
};

export function encodeAdminMfaSetupCookie(secret: string, now = Date.now()): string {
  const payload: AdminMfaSetupPayload = {
    secret,
    exp: now + ADMIN_MFA_SETUP_TTL_MS,
  };
  return encryptSecret(JSON.stringify(payload));
}

export function decodeAdminMfaSetupCookie(
  value: string | undefined,
  now = Date.now(),
): string | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decryptSecret(value)) as Partial<AdminMfaSetupPayload>;
    if (typeof parsed.secret !== "string" || !parsed.secret) return null;
    if (typeof parsed.exp !== "number" || now > parsed.exp) return null;
    return parsed.secret;
  } catch {
    return null;
  }
}

export function adminMfaSetupCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
    maxAge: Math.floor(ADMIN_MFA_SETUP_TTL_MS / 1000),
  };
}
