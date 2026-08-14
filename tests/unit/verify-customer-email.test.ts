import { beforeEach, describe, expect, it, vi } from "vitest";

const customerAuthTokenFindUnique = vi.fn();
const customerAuthTokenUpdate = vi.fn();
const customerUpdate = vi.fn();
const autoClaim = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    customerAuthToken: {
      findUnique: customerAuthTokenFindUnique,
      update: customerAuthTokenUpdate,
    },
    customer: { update: customerUpdate },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  }),
}));

vi.mock("@/features/customers/application/guest-order-claim", () => ({
  autoClaimGuestOrdersAfterVerification: autoClaim,
}));

beforeEach(() => {
  customerAuthTokenFindUnique.mockReset();
  customerAuthTokenUpdate.mockReset();
  customerUpdate.mockReset();
  autoClaim.mockReset();
});

describe("verifyCustomerEmail", () => {
  it("ordnet Gastbestellungen nach erfolgreicher Verifikation automatisch zu", async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    customerAuthTokenFindUnique.mockResolvedValue({
      id: "tok-1",
      purpose: "email_verify",
      customerId: "cust-a",
      expiresAt,
      consumedAt: null,
      customer: {
        id: "cust-a",
        email: "kunde@example.com",
        isActive: true,
        emailVerifiedAt: null,
      },
    });
    autoClaim.mockResolvedValue(2);

    const { verifyCustomerEmail } = await import(
      "@/features/customers/application/verify-customer-email"
    );
    const result = await verifyCustomerEmail({ token: "a".repeat(64) });

    expect(result).toEqual({
      ok: true,
      customerId: "cust-a",
      email: "kunde@example.com",
      claimedGuestOrderCount: 2,
    });
    expect(autoClaim).toHaveBeenCalledWith("cust-a");
  });
});
