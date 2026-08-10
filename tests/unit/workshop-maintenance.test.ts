import { beforeEach, describe, expect, it, vi } from "vitest";

const bookingAggregate = vi.fn();
const bookingCount = vi.fn();
const bookingFindMany = vi.fn();
const sessionFindMany = vi.fn();
const orderFindUnique = vi.fn();
const releaseExpired = vi.fn();
const confirmPaid = vi.fn();

vi.mock("@/features/workshops/application/workshop-seat-holds", () => ({
  releaseExpiredWorkshopSeatHolds: (...args: unknown[]) => releaseExpired(...args),
  confirmWorkshopBookingAfterOrderPaid: (...args: unknown[]) => confirmPaid(...args),
}));

const prisma = {
  workshopSession: { findMany: sessionFindMany },
  workshopBooking: {
    aggregate: bookingAggregate,
    count: bookingCount,
    findMany: bookingFindMany,
  },
  order: { findUnique: orderFindUnique },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
};

beforeEach(() => {
  releaseExpired.mockReset();
  confirmPaid.mockReset();
  bookingAggregate.mockReset();
  bookingCount.mockReset();
  bookingFindMany.mockReset();
  sessionFindMany.mockReset();
  orderFindUnique.mockReset();
  releaseExpired.mockResolvedValue(2);
  bookingCount.mockResolvedValue(0);
  bookingFindMany.mockResolvedValue([]);
  sessionFindMany.mockResolvedValue([]);
});

describe("runWorkshopMaintenance", () => {
  it("gibt abgelaufene Holds frei und meldet Kapazitäts-Alerts", async () => {
    sessionFindMany.mockResolvedValue([
      {
        id: "s1",
        title: "Test",
        capacity: 10,
        confirmedSeatCount: 5,
        heldSeatCount: -1,
      },
    ]);
    bookingAggregate
      .mockResolvedValueOnce({ _sum: { seatCount: 5 } })
      .mockResolvedValueOnce({ _sum: { seatCount: 0 } });

    const { runWorkshopMaintenance } = await import(
      "@/features/workshops/application/workshop-maintenance"
    );
    const result = await runWorkshopMaintenance(prisma as never);
    expect(result.expiredHoldsReleased).toBe(2);
    expect(result.capacityAlerts).toHaveLength(1);
    expect(result.capacityAlerts[0]?.reason).toContain("negative_counter");
  });

  it("repariert paid Orders mit noch held Buchung", async () => {
    bookingFindMany.mockResolvedValue([{ id: "b1", orderId: "o1" }]);
    orderFindUnique.mockResolvedValue({ id: "o1", status: "paid" });
    confirmPaid.mockResolvedValue(undefined);

    const { runWorkshopMaintenance } = await import(
      "@/features/workshops/application/workshop-maintenance"
    );
    const result = await runWorkshopMaintenance(prisma as never);
    expect(result.incompleteFinalizationsRepaired).toBe(1);
    expect(confirmPaid).toHaveBeenCalledWith(prisma, { orderId: "o1" });
  });
});
