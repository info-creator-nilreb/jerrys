import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
  return fn({
    adminUser: { update },
    integrationOutboxMessage: { create: vi.fn() },
  });
});

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    adminUser: { findUnique, update },
    $transaction: transaction,
  }),
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(async (plain: string, hash: string) => hash === `hash:${plain}`),
  hash: vi.fn(async (plain: string) => `hash:${plain}`),
}));

vi.mock("@/features/integrations", () => ({
  appendIntegrationOutbox: vi.fn(async () => undefined),
}));

import { changeAdminPassword } from "@/lib/auth/change-admin-password";

describe("changeAdminPassword", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    transaction.mockClear();
  });

  it("ändert das Passwort bei korrektem aktuellem Passwort", async () => {
    findUnique.mockResolvedValue({
      id: "a1",
      passwordHash: "hash:OldPass1234",
      isActive: true,
    });
    update.mockResolvedValue({});

    const result = await changeAdminPassword("a1", {
      currentPassword: "OldPass1234",
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalled();
    const data = update.mock.calls[0]?.[0]?.data as { credentialsChangedAt?: Date };
    expect(data.credentialsChangedAt).toBeInstanceOf(Date);
  });

  it("lehnt falsches aktuelles Passwort ab", async () => {
    findUnique.mockResolvedValue({
      id: "a1",
      passwordHash: "hash:OldPass1234",
      isActive: true,
    });

    const result = await changeAdminPassword("a1", {
      currentPassword: "WrongPass12",
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.currentPassword?.[0]).toMatch(/nicht korrekt/i);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("lehnt dasselbe neue Passwort ab", async () => {
    findUnique.mockResolvedValue({
      id: "a1",
      passwordHash: "hash:OldPass1234",
      isActive: true,
    });

    const result = await changeAdminPassword("a1", {
      currentPassword: "OldPass1234",
      password: "OldPass1234",
      passwordConfirm: "OldPass1234",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.password?.[0]).toMatch(/unterscheiden/i);
    }
  });

  it("lehnt inaktive Admins ab", async () => {
    findUnique.mockResolvedValue({
      id: "a1",
      passwordHash: "hash:OldPass1234",
      isActive: false,
    });

    const result = await changeAdminPassword("a1", {
      currentPassword: "OldPass1234",
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });

    expect(result.ok).toBe(false);
  });
});
