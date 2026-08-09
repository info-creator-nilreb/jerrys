import { beforeEach, describe, expect, it, vi } from "vitest";

const orderFindMany = vi.fn();
const orderCount = vi.fn();
const orderUpdateMany = vi.fn();
const customerFindUnique = vi.fn();
const orderEventCreate = vi.fn();
const outboxCreate = vi.fn();

const tx = {
  order: { updateMany: orderUpdateMany },
  orderEvent: { create: orderEventCreate },
  integrationOutboxMessage: { create: outboxCreate },
};

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    order: {
      findMany: orderFindMany,
      count: orderCount,
      updateMany: orderUpdateMany,
    },
    customer: { findUnique: customerFindUnique },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }),
}));

function verifiedCustomer(email = "Kunde@Example.com") {
  customerFindUnique.mockImplementation(async (args: { select?: Record<string, boolean> }) => {
    if (args?.select?.email && !args.select.isActive) {
      return { id: "cust-a", email };
    }
    return { id: "cust-a", isActive: true, emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z") };
  });
}

function guestOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNumber: "J-1",
    status: "paid",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    totalGrossCents: 1990,
    currency: "EUR",
    shippingLastName: "Muster",
    shippingCity: "Berlin",
    _count: { items: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  orderFindMany.mockReset();
  orderCount.mockReset();
  orderUpdateMany.mockReset();
  customerFindUnique.mockReset();
  orderEventCreate.mockReset();
  outboxCreate.mockReset();
});

describe("listClaimableGuestOrders", () => {
  it("sucht nur Bestellungen ohne Konto und mit der verifizierten E-Mail", async () => {
    verifiedCustomer();
    orderFindMany.mockResolvedValue([guestOrderRow()]);

    const { listClaimableGuestOrders } = await import("@/features/customers");
    const rows = await listClaimableGuestOrders("cust-a");

    expect(orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerId: null,
          // E-Mail aus dem Konto, normalisiert — nie aus Nutzereingabe.
          email: { equals: "kunde@example.com", mode: "insensitive" },
        },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.orderNumber).toBe("J-1");
    expect(rows[0]?.itemCount).toBe(2);
  });

  it("liefert nichts für unverifizierte Konten", async () => {
    customerFindUnique.mockResolvedValue({
      id: "cust-a",
      isActive: true,
      emailVerifiedAt: null,
    });

    const { listClaimableGuestOrders, countClaimableGuestOrders } = await import(
      "@/features/customers"
    );
    expect(await listClaimableGuestOrders("cust-a")).toEqual([]);
    expect(await countClaimableGuestOrders("cust-a")).toBe(0);
    expect(orderFindMany).not.toHaveBeenCalled();
    expect(orderCount).not.toHaveBeenCalled();
  });
});

describe("claimGuestOrdersForCustomer", () => {
  it("verweigert die Zuordnung ohne verifizierte E-Mail", async () => {
    customerFindUnique.mockResolvedValue({
      id: "cust-a",
      isActive: true,
      emailVerifiedAt: null,
    });

    const { claimGuestOrdersForCustomer } = await import("@/features/customers");
    const result = await claimGuestOrdersForCustomer("cust-a");

    expect(result.ok).toBe(false);
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });

  it("ordnet nur unzugeordnete Bestellungen zu und schreibt je Bestellung ein Auditereignis", async () => {
    verifiedCustomer();
    orderFindMany.mockResolvedValue([
      { id: "o1", orderNumber: "J-1" },
      { id: "o2", orderNumber: "J-2" },
    ]);
    orderUpdateMany.mockResolvedValue({ count: 1 });

    const { claimGuestOrdersForCustomer, ORDER_EVENT_CUSTOMER_LINKED } = await import(
      "@/features/customers"
    );
    const result = await claimGuestOrdersForCustomer("cust-a");

    expect(result).toEqual({ ok: true, claimedCount: 2 });
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "o1", customerId: null },
      data: { customerId: "cust-a" },
    });
    expect(orderEventCreate).toHaveBeenCalledTimes(2);
    expect(orderEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "o1",
          eventType: ORDER_EVENT_CUSTOMER_LINKED,
        }),
      }),
    );
  });

  it("ist idempotent: bereits zugeordnete Bestellungen zählen nicht erneut", async () => {
    verifiedCustomer();
    orderFindMany.mockResolvedValue([{ id: "o1", orderNumber: "J-1" }]);
    // Parallel-Request war schneller: die Bedingung `customerId: null` greift nicht mehr.
    orderUpdateMany.mockResolvedValue({ count: 0 });

    const { claimGuestOrdersForCustomer } = await import("@/features/customers");
    const result = await claimGuestOrdersForCustomer("cust-a");

    expect(result.ok).toBe(false);
    expect(orderEventCreate).not.toHaveBeenCalled();
  });

  it("meldet Erfolg ohne Änderungen, wenn es nichts zuzuordnen gibt", async () => {
    verifiedCustomer();
    orderFindMany.mockResolvedValue([]);

    const { claimGuestOrdersForCustomer } = await import("@/features/customers");
    expect(await claimGuestOrdersForCustomer("cust-a")).toEqual({ ok: true, claimedCount: 0 });
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });
});
