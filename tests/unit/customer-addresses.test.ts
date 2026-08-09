import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findFirst = vi.fn();
const findUnique = vi.fn();
const count = vi.fn();
const create = vi.fn();
const update = vi.fn();
const updateMany = vi.fn();
const deleteFn = vi.fn();

const tx = {
  customerAddress: {
    updateMany,
    create,
    update,
    delete: deleteFn,
    findFirst,
  },
};

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    customerAddress: {
      findMany,
      findFirst,
      count,
      create,
      update,
      updateMany,
      delete: deleteFn,
    },
    customer: {
      findUnique,
    },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }),
}));

function verifiedCustomer() {
  findUnique.mockResolvedValue({
    id: "cust-a",
    isActive: true,
    emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
  });
}

describe("customer addresses (AuthZ)", () => {
  beforeEach(() => {
    findMany.mockReset();
    findFirst.mockReset();
    findUnique.mockReset();
    count.mockReset();
    create.mockReset();
    update.mockReset();
    updateMany.mockReset();
    deleteFn.mockReset();
  });

  it("listet Adressen nur für verifizierten Kunden mit customerId-Filter", async () => {
    verifiedCustomer();
    findMany.mockResolvedValue([
      {
        id: "addr-1",
        kind: "shipping",
        label: null,
        firstName: "Max",
        lastName: "Muster",
        company: null,
        line1: "Hauptstr. 1",
        line2: null,
        zip: "10115",
        city: "Berlin",
        country: "DE",
        isDefault: true,
      },
    ]);

    const { listCustomerAddresses } = await import("@/features/customers");
    const rows = await listCustomerAddresses("cust-a");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: "cust-a" },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kindLabel).toBe("Lieferadresse");
  });

  it("liefert null für fremde Adresse (kein Leak)", async () => {
    verifiedCustomer();
    findFirst.mockResolvedValue(null);

    const { getCustomerAddressForCustomer } = await import("@/features/customers");
    const row = await getCustomerAddressForCustomer("cust-a", "addr-fremd");
    expect(row).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "addr-fremd", customerId: "cust-a" },
      }),
    );
  });

  it("gibt leere Liste ohne verifiziertes Konto zurück", async () => {
    findUnique.mockResolvedValue({
      id: "cust-a",
      isActive: true,
      emailVerifiedAt: null,
    });

    const { listCustomerAddresses } = await import("@/features/customers");
    const rows = await listCustomerAddresses("cust-a");
    expect(rows).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
