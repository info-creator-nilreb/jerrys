import { describe, expect, it, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
const upsert = vi.fn();
const transaction = vi.fn(async (ops: unknown[]) => {
  for (const op of ops) await op;
});

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    customer: { findUnique, update },
    customerIdentity: { upsert },
    $transaction: transaction,
  }),
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(async (plain: string, hash: string) => {
    return hash === `hash:${plain}`;
  }),
  hash: vi.fn(async (plain: string) => `hash:${plain}`),
}));

import { changeCustomerPassword } from "@/features/customers/application/change-customer-password";

describe("changeCustomerPassword", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    upsert.mockReset();
    transaction.mockClear();
  });

  it("ändert Passwort bei korrektem aktuellem Passwort", async () => {
    findUnique.mockResolvedValue({
      id: "c1",
      email: "a@b.co",
      passwordHash: "hash:OldPass1234",
      isActive: true,
    });
    update.mockResolvedValue({});
    upsert.mockResolvedValue({});

    const result = await changeCustomerPassword("c1", {
      currentPassword: "OldPass1234",
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });

    expect(result.ok).toBe(true);
    expect(transaction).toHaveBeenCalled();
  });

  it("lehnt falsches aktuelles Passwort ab", async () => {
    findUnique.mockResolvedValue({
      id: "c1",
      email: "a@b.co",
      passwordHash: "hash:OldPass1234",
      isActive: true,
    });

    const result = await changeCustomerPassword("c1", {
      currentPassword: "WrongPass12",
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.currentPassword?.[0]).toMatch(/nicht korrekt/i);
    }
  });

  it("erlaubt Setzen ohne aktuelles Passwort bei Magic-Link-Konto", async () => {
    findUnique.mockResolvedValue({
      id: "c1",
      email: "a@b.co",
      passwordHash: null,
      isActive: true,
    });
    update.mockResolvedValue({});
    upsert.mockResolvedValue({});

    const result = await changeCustomerPassword("c1", {
      password: "NewPass1234",
      passwordConfirm: "NewPass1234",
    });

    expect(result.ok).toBe(true);
  });
});
