import { afterEach, describe, expect, it } from "vitest";
import {
  decodeAdminMfaSetupCookie,
  encodeAdminMfaSetupCookie,
} from "@/lib/auth/admin-mfa-setup-cookie";

const PREV_KEY = process.env.AUTH_SECRET;

afterEach(() => {
  if (PREV_KEY === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = PREV_KEY;
});

describe("admin mfa setup cookie", () => {
  it("rundet Secret über Encrypt/Decrypt", () => {
    process.env.AUTH_SECRET = "test-auth-secret-for-admin-mfa-cookie";
    const encoded = encodeAdminMfaSetupCookie("JBSWY3DPEHPK3PXP", Date.parse("2026-08-15T12:00:00Z"));
    expect(encoded.includes("JBSWY3DPEHPK3PXP")).toBe(false);
    expect(decodeAdminMfaSetupCookie(encoded, Date.parse("2026-08-15T12:05:00Z"))).toBe(
      "JBSWY3DPEHPK3PXP",
    );
  });

  it("lehnt abgelaufene Cookies ab", () => {
    process.env.AUTH_SECRET = "test-auth-secret-for-admin-mfa-cookie";
    const encoded = encodeAdminMfaSetupCookie("SECRET", Date.parse("2026-08-15T12:00:00Z"));
    expect(decodeAdminMfaSetupCookie(encoded, Date.parse("2026-08-15T12:20:00Z"))).toBeNull();
  });
});
