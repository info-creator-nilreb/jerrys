import { beforeEach, describe, expect, it, vi } from "vitest";

const bookingFindMany = vi.fn();
const bookingFindFirst = vi.fn();
const bookingFindUnique = vi.fn();
const bookingUpdateMany = vi.fn();
const sessionUpdateMany = vi.fn();
const workshopBookingEventCreate = vi.fn();
const outboxCreate = vi.fn();
const shopSettingsUpsert = vi.fn();
const customerFindUnique = vi.fn();

const tx = {
  workshopBooking: {
    updateMany: bookingUpdateMany,
    findUnique: bookingFindUnique,
  },
  workshopSession: { updateMany: sessionUpdateMany },
  workshopBookingEvent: { create: workshopBookingEventCreate },
  integrationOutboxMessage: { create: outboxCreate },
};

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    workshopBooking: {
      findMany: bookingFindMany,
      findFirst: bookingFindFirst,
      findUnique: bookingFindUnique,
      updateMany: bookingUpdateMany,
    },
    shopWorkshopSettings: { upsert: shopSettingsUpsert },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }),
}));

function verifiedCustomer() {
  customerFindUnique.mockImplementation(async (args: { select?: Record<string, boolean> }) => {
    if (args?.select?.email && !args.select.isActive) {
      return { id: "cust-a", email: "kunde@example.com" };
    }
    return { id: "cust-a", isActive: true, emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z") };
  });
}

vi.mock("@/features/customers/application/get-verified-active-customer-id", () => ({
  getVerifiedActiveCustomerId: async (id: string) => {
    const row = await customerFindUnique({
      select: { isActive: true, emailVerifiedAt: true },
    });
    if (!row?.isActive || !row.emailVerifiedAt) return null;
    return id;
  },
}));

beforeEach(() => {
  bookingFindMany.mockReset();
  bookingFindFirst.mockReset();
  bookingFindUnique.mockReset();
  bookingUpdateMany.mockReset();
  sessionUpdateMany.mockReset();
  workshopBookingEventCreate.mockReset();
  outboxCreate.mockReset();
  shopSettingsUpsert.mockReset();
  customerFindUnique.mockReset();
  shopSettingsUpsert.mockResolvedValue({ selfCancelHoursBeforeStart: 48 });
});

describe("selfCancelWorkshopBookingForCustomer", () => {
  it("storniert idempotent bei paralleler Doppelanfrage", async () => {
    verifiedCustomer();
    bookingFindFirst.mockResolvedValue({
      id: "b1",
      status: "confirmed",
      seatCount: 2,
      unitPriceCentsSnapshot: 0,
      currencySnapshot: "EUR",
      sessionId: "s1",
      sessionStartsAtSnapshot: new Date("2026-08-20T14:00:00.000Z"),
      session: { status: "published", selfCancelHoursBeforeStart: null, confirmedSeatCount: 2 },
    });
    bookingUpdateMany.mockResolvedValue({ count: 0 });
    bookingFindUnique.mockResolvedValue({ status: "cancelled" });

    const { selfCancelWorkshopBookingForCustomer } = await import("@/features/workshops");
    const result = await selfCancelWorkshopBookingForCustomer({
      customerId: "cust-a",
      bookingId: "b1",
    });

    expect(result).toEqual({ ok: true, alreadyCancelled: true });
  });

  it("gibt Plätze frei und schreibt Audit bei erfolgreicher Storno", async () => {
    verifiedCustomer();
    bookingFindFirst.mockResolvedValue({
      id: "b1",
      status: "confirmed",
      seatCount: 2,
      unitPriceCentsSnapshot: 1500,
      currencySnapshot: "EUR",
      sessionId: "s1",
      sessionStartsAtSnapshot: new Date("2099-08-20T14:00:00.000Z"),
      session: { status: "published", selfCancelHoursBeforeStart: null, confirmedSeatCount: 4 },
    });
    bookingUpdateMany.mockResolvedValue({ count: 1 });
    sessionUpdateMany.mockResolvedValue({ count: 1 });

    const { selfCancelWorkshopBookingForCustomer } = await import("@/features/workshops");
    const result = await selfCancelWorkshopBookingForCustomer({
      customerId: "cust-a",
      bookingId: "b1",
    });

    expect(result).toEqual({ ok: true, alreadyCancelled: false });
    expect(sessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1", confirmedSeatCount: { gte: 2 } },
        data: { confirmedSeatCount: { decrement: 2 } },
      }),
    );
    expect(workshopBookingEventCreate).toHaveBeenCalled();
  });
});
