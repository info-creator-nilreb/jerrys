import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateTotp, generateTotpSecret } from "@/lib/auth/admin-totp";
import { hashAdminMfaRecoveryCode } from "@/lib/auth/admin-mfa-recovery";
import { encryptSecret } from "@/lib/security/secret-crypto";

const findUnique = vi.fn();
const updateMany = vi.fn();
const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
  return fn({
    adminMfaRecoveryCode: { updateMany },
    integrationOutboxMessage: { create: vi.fn() },
  });
});

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    adminUser: { findUnique },
    $transaction: transaction,
  }),
}));

vi.mock("@/features/integrations", () => ({
  appendIntegrationOutbox: vi.fn(async () => undefined),
}));

vi.mock("@/lib/shop/shop-settings", () => ({
  getShopSettings: vi.fn(async () => ({ shopName: "jerry's" })),
}));

import { verifyAdminMfaCode } from "@/lib/auth/admin-mfa";

describe("verifyAdminMfaCode", () => {
  const secret = generateTotpSecret();

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-for-admin-mfa-verify";
    findUnique.mockReset();
    updateMany.mockReset();
    transaction.mockClear();
  });

  it("akzeptiert einen gültigen TOTP-Code", async () => {
    findUnique.mockResolvedValue({
      isActive: true,
      mfaEnabled: true,
      mfaSecretEnc: encryptSecret(secret),
      recoveryCodes: [],
    });
    const code = generateTotp(secret, Date.parse("2026-08-15T12:00:00.000Z"));
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-08-15T12:00:00.000Z"));

    const result = await verifyAdminMfaCode("a1", code, { consumeRecovery: true });
    expect(result).toEqual({ ok: true, usedRecovery: false });
    expect(updateMany).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("verbraucht einen Recovery-Code nur einmal", async () => {
    const raw = "ABCDE-FGHIJ";
    findUnique.mockResolvedValue({
      isActive: true,
      mfaEnabled: true,
      mfaSecretEnc: encryptSecret(secret),
      recoveryCodes: [{ id: "r1", codeHash: hashAdminMfaRecoveryCode(raw) }],
    });
    updateMany.mockResolvedValue({ count: 1 });

    const first = await verifyAdminMfaCode("a1", raw, { consumeRecovery: true });
    expect(first).toEqual({ ok: true, usedRecovery: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "r1", consumedAt: null },
      data: { consumedAt: expect.any(Date) },
    });

    updateMany.mockResolvedValue({ count: 0 });
    const second = await verifyAdminMfaCode("a1", raw, { consumeRecovery: true });
    expect(second.ok).toBe(false);
  });
});
