import { beforeEach, describe, expect, it, vi } from "vitest";

const customerFindUnique = vi.fn();
const customerUpdate = vi.fn();
const orderFindMany = vi.fn();
const orderUpdateMany = vi.fn();
const workshopBookingFindMany = vi.fn();
const addressDeleteMany = vi.fn();
const tokenDeleteMany = vi.fn();
const identityDeleteMany = vi.fn();
const orderEventCreate = vi.fn();
const outboxCreate = vi.fn();

const tx = {
  order: { updateMany: orderUpdateMany },
  orderEvent: { create: orderEventCreate },
  integrationOutboxMessage: { create: outboxCreate },
  customerAddress: { deleteMany: addressDeleteMany },
  customerAuthToken: { deleteMany: tokenDeleteMany },
  customerIdentity: { deleteMany: identityDeleteMany },
  customer: { update: customerUpdate },
};

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    customer: { findUnique: customerFindUnique, update: customerUpdate },
    order: { findMany: orderFindMany, updateMany: orderUpdateMany },
    workshopBooking: { findMany: workshopBookingFindMany },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }),
}));

const VERIFIED = {
  id: "cust-a",
  isActive: true,
  emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
};

function exportRow() {
  return {
    email: "kunde@example.com",
    firstName: "Max",
    lastName: "Muster",
    emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    identities: [{ provider: "password", createdAt: new Date("2026-07-01T00:00:00.000Z") }],
    addresses: [
      {
        kind: "shipping",
        label: null,
        firstName: "Max",
        lastName: "Muster",
        company: null,
        line1: "Invalidenstr. 12",
        line2: null,
        zip: "10115",
        city: "Berlin",
        country: "DE",
        isDefault: true,
      },
    ],
    orders: [
      {
        orderNumber: "J-1",
        createdAt: new Date("2026-07-15T00:00:00.000Z"),
        status: "paid",
        fulfillmentStatus: "unfulfilled",
        email: "kunde@example.com",
        phone: null,
        paymentMethod: "paypal",
        currency: "EUR",
        subtotalGrossCents: 7990,
        shippingCents: 0,
        discountOffSubtotalCents: 0,
        taxAmountCents: 1275,
        totalGrossCents: 7990,
        shippingFirstName: "Max",
        shippingLastName: "Muster",
        shippingCompany: null,
        shippingLine1: "Invalidenstr. 12",
        shippingLine2: null,
        shippingZip: "10115",
        shippingCity: "Berlin",
        shippingCountry: "DE",
        billingFirstName: "Max",
        billingLastName: "Muster",
        billingCompany: null,
        billingLine1: "Invalidenstr. 12",
        billingLine2: null,
        billingZip: "10115",
        billingCity: "Berlin",
        billingCountry: "DE",
        items: [
          {
            productTitleSnapshot: "Design Katzenhöhle",
            skuSnapshot: "SKU-1",
            quantity: 1,
            unitPriceGrossCents: 7990,
            lineTotalGrossCents: 7990,
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  customerFindUnique.mockReset();
  customerUpdate.mockReset();
  orderFindMany.mockReset();
  orderUpdateMany.mockReset();
  addressDeleteMany.mockReset();
  tokenDeleteMany.mockReset();
  identityDeleteMany.mockReset();
  orderEventCreate.mockReset();
  outboxCreate.mockReset();
  workshopBookingFindMany.mockReset();
  workshopBookingFindMany.mockResolvedValue([]);
});

describe("exportCustomerData", () => {
  it("liefert Konto, Adressen und Bestellungen ohne Sicherheitsmerkmale", async () => {
    customerFindUnique.mockResolvedValueOnce(VERIFIED).mockResolvedValueOnce(exportRow());

    const { exportCustomerData } = await import("@/features/customers");
    const data = await exportCustomerData("cust-a");

    expect(data).not.toBeNull();
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("tokenHash");
    expect(data?.konto.email).toBe("kunde@example.com");
    expect(data?.anmeldeverfahren).toEqual([
      { verfahren: "password", verknuepftSeit: "2026-07-01T00:00:00.000Z" },
    ]);
    expect(data?.adressen).toHaveLength(1);
    expect(data?.bestellungen[0]?.bestellnummer).toBe("J-1");
    expect(data?.bestellungen[0]?.positionen[0]?.artikel).toBe("Design Katzenhöhle");
  });

  it("verweigert den Export ohne bestätigte E-Mail", async () => {
    customerFindUnique.mockResolvedValue({ id: "cust-a", isActive: true, emailVerifiedAt: null });

    const { exportCustomerData } = await import("@/features/customers");
    expect(await exportCustomerData("cust-a")).toBeNull();
  });
});

describe("updateCustomerProfile", () => {
  it("speichert getrimmte Namen", async () => {
    customerFindUnique.mockResolvedValue(VERIFIED);
    customerUpdate.mockResolvedValue({});

    const { updateCustomerProfile } = await import("@/features/customers");
    const result = await updateCustomerProfile("cust-a", {
      firstName: "  Max  ",
      lastName: "Muster",
    });

    expect(result.ok).toBe(true);
    expect(customerUpdate).toHaveBeenCalledWith({
      where: { id: "cust-a" },
      data: { firstName: "Max", lastName: "Muster" },
    });
  });

  it("lehnt überlange Namen ab", async () => {
    customerFindUnique.mockResolvedValue(VERIFIED);

    const { updateCustomerProfile } = await import("@/features/customers");
    const result = await updateCustomerProfile("cust-a", { firstName: "x".repeat(81) });

    expect(result.ok).toBe(false);
    expect(customerUpdate).not.toHaveBeenCalled();
  });

  it("verlangt eine bestätigte E-Mail", async () => {
    customerFindUnique.mockResolvedValue({ id: "cust-a", isActive: true, emailVerifiedAt: null });

    const { updateCustomerProfile } = await import("@/features/customers");
    expect((await updateCustomerProfile("cust-a", { firstName: "Max" })).ok).toBe(false);
    expect(customerUpdate).not.toHaveBeenCalled();
  });
});

describe("anonymizeCustomerAccount", () => {
  it("löst Bestellungen vom Konto, entfernt Login-Daten und auditiert jede Entkopplung", async () => {
    customerFindUnique.mockResolvedValue(VERIFIED);
    orderFindMany.mockResolvedValue([
      { id: "o1", orderNumber: "J-1" },
      { id: "o2", orderNumber: "J-2" },
    ]);
    orderUpdateMany.mockResolvedValue({ count: 1 });
    customerUpdate.mockResolvedValue({});

    const { anonymizeCustomerAccount, ORDER_EVENT_CUSTOMER_UNLINKED } = await import(
      "@/features/customers"
    );
    const result = await anonymizeCustomerAccount("cust-a");

    expect(result).toEqual({ ok: true, detachedOrderCount: 2 });
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "o1", customerId: "cust-a" },
      data: { customerId: null },
    });
    expect(orderEventCreate).toHaveBeenCalledTimes(2);
    expect(orderEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: ORDER_EVENT_CUSTOMER_UNLINKED }),
      }),
    );

    // Adressbuch, Tokens und Identitäten werden gelöscht.
    expect(addressDeleteMany).toHaveBeenCalledWith({ where: { customerId: "cust-a" } });
    expect(tokenDeleteMany).toHaveBeenCalledWith({ where: { customerId: "cust-a" } });
    expect(identityDeleteMany).toHaveBeenCalledWith({ where: { customerId: "cust-a" } });

    // Konto ist danach nicht mehr anmeldbar und trägt keine Klardaten.
    const updateArg = customerUpdate.mock.calls.at(-1)?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data.isActive).toBe(false);
    expect(updateArg.data.passwordHash).toBeNull();
    expect(updateArg.data.emailVerifiedAt).toBeNull();
    expect(updateArg.data.firstName).toBeNull();
    expect(updateArg.data.lastName).toBeNull();
    expect(String(updateArg.data.email)).toMatch(/^geloescht\+cust-a@invalid$/);
    expect(updateArg.data.anonymizedAt).toBeInstanceOf(Date);
  });

  it("verweigert die Löschung ohne bestätigte E-Mail", async () => {
    customerFindUnique.mockResolvedValue({ id: "cust-a", isActive: true, emailVerifiedAt: null });

    const { anonymizeCustomerAccount } = await import("@/features/customers");
    const result = await anonymizeCustomerAccount("cust-a");

    expect(result.ok).toBe(false);
    expect(orderFindMany).not.toHaveBeenCalled();
    expect(customerUpdate).not.toHaveBeenCalled();
  });
});
