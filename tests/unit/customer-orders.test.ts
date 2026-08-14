import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findFirst = vi.fn();
const findUnique = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    order: {
      findMany,
      findFirst,
    },
    customer: {
      findUnique,
    },
  }),
}));

describe("customer order queries (AuthZ)", () => {
  beforeEach(() => {
    findMany.mockReset();
    findFirst.mockReset();
    findUnique.mockReset();
  });

  it("listet nur Bestellungen mit customerId-Filter", async () => {
    findMany.mockResolvedValue([
      {
        id: "o1",
        orderNumber: "J-1",
        status: "paid",
        fulfillmentStatus: "unfulfilled",
        deliveryMethod: "shipping",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        totalGrossCents: 1990,
        currency: "EUR",
        _count: { items: 2 },
      },
    ]);

    const { listOrdersForCustomer } = await import("@/features/customers");
    const rows = await listOrdersForCustomer("cust-a");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: "cust-a" },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.orderNumber).toBe("J-1");
    expect(rows[0]?.itemCount).toBe(2);
  });

  it("liefert null für fremde oder fehlende Bestellung (kein Leak)", async () => {
    findFirst.mockResolvedValue(null);
    const { getOrderForCustomer } = await import("@/features/customers");
    const order = await getOrderForCustomer({
      customerId: "cust-a",
      orderNumber: "J-fremd",
    });
    expect(order).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderNumber: "J-fremd", customerId: "cust-a" },
      }),
    );
  });

  it("getVerifiedActiveCustomerId verlangt aktive, verifizierte Konten", async () => {
    const { getVerifiedActiveCustomerId } = await import("@/features/customers");

    findUnique.mockResolvedValue({
      id: "c1",
      isActive: true,
      emailVerifiedAt: null,
    });
    expect(await getVerifiedActiveCustomerId("c1")).toBeNull();

    findUnique.mockResolvedValue({
      id: "c1",
      isActive: true,
      emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(await getVerifiedActiveCustomerId("c1")).toBe("c1");
  });
});
