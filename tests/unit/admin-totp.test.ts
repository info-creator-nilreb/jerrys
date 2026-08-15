import { describe, expect, it } from "vitest";
import {
  buildOtpauthUrl,
  decodeBase32,
  encodeBase32,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/auth/admin-totp";

describe("admin totp", () => {
  it("kodiert und dekodiert Base32 rund", () => {
    const raw = Buffer.from("hello-totp-secret!!");
    const encoded = encodeBase32(raw);
    expect(decodeBase32(encoded).equals(raw)).toBe(true);
  });

  it("verifiziert den aktuellen Code und das Nachbarfenster", () => {
    const secret = generateTotpSecret();
    const now = Date.parse("2026-08-15T12:00:00.000Z");
    const code = generateTotp(secret, now);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, code, now + 30_000)).toBe(true);
    expect(verifyTotp(secret, code, now + 90_000)).toBe(false);
    expect(verifyTotp(secret, "000000", now)).toBe(false);
  });

  it("baut eine otpauth-URL ohne Secret im Issuer", () => {
    const url = buildOtpauthUrl({
      issuer: "jerry's",
      account: "admin@example.com",
      secret: "JBSWY3DPEHPK3PXP",
    });
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("admin%40example.com");
  });
});
