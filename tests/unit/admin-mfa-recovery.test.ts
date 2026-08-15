import { describe, expect, it } from "vitest";
import {
  ADMIN_MFA_RECOVERY_CODE_COUNT,
  generateAdminMfaRecoveryCodes,
  hashAdminMfaRecoveryCode,
  normalizeAdminMfaRecoveryCode,
  recoveryCodeHashesEqual,
} from "@/lib/auth/admin-mfa-recovery";

describe("admin mfa recovery codes", () => {
  it("erzeugt die erwartete Anzahl eindeutiger Codes", () => {
    const codes = generateAdminMfaRecoveryCodes();
    expect(codes).toHaveLength(ADMIN_MFA_RECOVERY_CODE_COUNT);
    expect(new Set(codes).size).toBe(ADMIN_MFA_RECOVERY_CODE_COUNT);
    expect(codes.every((c) => /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(c))).toBe(true);
  });

  it("normalisiert und hasht unabhängig von Bindestrichen", () => {
    const a = hashAdminMfaRecoveryCode("ab12c-def34");
    const b = hashAdminMfaRecoveryCode("AB12CDEF34");
    expect(recoveryCodeHashesEqual(a, b)).toBe(true);
    expect(normalizeAdminMfaRecoveryCode("xx-yy")).toBe("XXYY");
  });

  it("erkennt ungleiche Hashes", () => {
    const a = hashAdminMfaRecoveryCode("AAAAA-BBBBB");
    const b = hashAdminMfaRecoveryCode("CCCCC-DDDDD");
    expect(recoveryCodeHashesEqual(a, b)).toBe(false);
  });
});
