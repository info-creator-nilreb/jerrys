import { createHash, randomBytes } from "node:crypto";

export const CUSTOMER_AUTH_TOKEN_PURPOSES = [
  "email_verify",
  "magic_link",
  "password_reset",
] as const;

export type CustomerAuthTokenPurpose = (typeof CUSTOMER_AUTH_TOKEN_PURPOSES)[number];

export const CUSTOMER_IDENTITY_PROVIDERS = ["password", "magic_link"] as const;

export type CustomerIdentityProvider = (typeof CUSTOMER_IDENTITY_PROVIDERS)[number];

/** TTL for verify / magic / reset tokens. */
export const CUSTOMER_AUTH_TOKEN_TTL_MS = 60 * 60 * 1000;

export function generateCustomerAuthTokenSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashCustomerAuthToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function customerAuthTokenExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + CUSTOMER_AUTH_TOKEN_TTL_MS);
}

export function isCustomerAuthTokenUsable(params: {
  expiresAt: Date;
  consumedAt: Date | null;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  if (params.consumedAt) return false;
  return params.expiresAt.getTime() > now.getTime();
}

export { normalizeCustomerAuthTokenFromClient } from "@/features/customers/domain/auth-token-client";
