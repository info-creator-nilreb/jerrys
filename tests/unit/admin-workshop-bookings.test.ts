import { beforeEach, describe, expect, it, vi } from "vitest";

const bookingFindMany = vi.fn();
const bookingFindUnique = vi.fn();
const bookingUpdateMany = vi.fn();
const bookingCount = vi.fn();
const sessionFindUnique = vi.fn();
const sessionUpdateMany = vi.fn();
const orderFindMany = vi.fn();
const workshopBookingEventCreate = vi.fn();
const outboxCreate = vi.fn();
const sendCancelled = vi.fn();
const tryRefund = vi.fn();

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
      findUnique: bookingFindUnique,
      updateMany: bookingUpdateMany,
      count: bookingCount,
    },
    workshopSession: {
      findUnique: sessionFindUnique,
      updateMany: sessionUpdateMany,
    },
    order: { findMany: orderFindMany },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }),
}));

vi.mock("@/lib/email/workshop-booking-emails", () => ({
  sendWorkshopBookingCancelledForBookingId: (...args: unknown[]) => sendCancelled(...args),
}));

vi.mock("@/features/workshops/application/workshop-booking-refund", () => ({
  tryRefundWorkshopBookingOrder: (...args: unknown[]) => tryRefund(...args),
}));

beforeEach(() => {
  bookingFindMany.mockReset();
  bookingFindUnique.mockReset();
  bookingUpdateMany.mockReset();
  bookingCount.mockReset();
  sessionFindUnique.mockReset();
  sessionUpdateMany.mockReset();
  orderFindMany.mockReset();
  workshopBookingEventCreate.mockReset();
  outboxCreate.mockReset();
  sendCancelled.mockReset();
  tryRefund.mockReset();
  sendCancelled.mockResolvedValue(undefined);
  tryRefund.mockResolvedValue({ attempted: true, ok: true });
  workshopBookingEventCreate.mockResolvedValue({});
  outboxCreate.mockResolvedValue({});
});

describe("adminCancelWorkshopBooking", () => {
  it("storniert bestätigt, gibt Plätze frei und sendet Mail", async () => {
    bookingFindUnique.mockResolvedValue({
      id: "b1",
      status: "confirmed",
      seatCount: 2,
      sessionId: "s1",
      unitPriceCentsSnapshot: 5900,
      orderId: "o1",
    });
    bookingUpdateMany.mockResolvedValue({ count: 1 });
    sessionUpdateMany.mockResolvedValue({ count: 1 });

    const { adminCancelWorkshopBooking } = await import(
      "@/features/workshops/application/admin-workshop-bookings"
    );
    const result = await adminCancelWorkshopBooking({ bookingId: "b1" });
    expect(result).toEqual({ ok: true });
    expect(bookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1", status: "confirmed" },
        data: expect.objectContaining({ status: "cancelled", cancelReason: "admin_cancel" }),
      }),
    );
    expect(sessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { confirmedSeatCount: { decrement: 2 } },
      }),
    );
    expect(sendCancelled).toHaveBeenCalledWith("b1");
    expect(tryRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "b1",
        orderId: "o1",
        actor: "workshop_admin_cancel",
      }),
    );
  });

  it("lehnt nicht-bestätigte Buchungen ab", async () => {
    bookingFindUnique.mockResolvedValue({
      id: "b1",
      status: "held",
      seatCount: 1,
      sessionId: "s1",
      unitPriceCentsSnapshot: 0,
      orderId: null,
    });
    const { adminCancelWorkshopBooking } = await import(
      "@/features/workshops/application/admin-workshop-bookings"
    );
    const result = await adminCancelWorkshopBooking({ bookingId: "b1" });
    expect(result.ok).toBe(false);
    expect(sendCancelled).not.toHaveBeenCalled();
    expect(tryRefund).not.toHaveBeenCalled();
  });
});

describe("cancelConfirmedBookingsAfterSessionCancelled", () => {
  it("storniert confirmed und gibt held frei", async () => {
    bookingFindMany
      .mockResolvedValueOnce([
        {
          id: "c1",
          seatCount: 2,
          orderId: "o1",
          unitPriceCentsSnapshot: 1000,
        },
      ])
      .mockResolvedValueOnce([{ id: "h1", seatCount: 1 }]);
    bookingUpdateMany.mockResolvedValue({ count: 1 });
    sessionUpdateMany.mockResolvedValue({ count: 1 });

    const { cancelConfirmedBookingsAfterSessionCancelled } = await import(
      "@/features/workshops/application/admin-workshop-bookings"
    );
    const result = await cancelConfirmedBookingsAfterSessionCancelled("s1");
    expect(result.cancelledBookingIds).toEqual(["c1"]);
    expect(result.releasedHoldIds).toEqual(["h1"]);
    expect(sendCancelled).toHaveBeenCalledWith("c1");
    expect(sendCancelled).toHaveBeenCalledTimes(1);
    expect(tryRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "c1",
        actor: "workshop_session_cancel",
      }),
    );
  });
});

describe("getWorkshopSessionParticipationSummaryForAdmin", () => {
  it("meldet Mindestteilnehmer erreicht/nicht erreicht", async () => {
    sessionFindUnique.mockResolvedValue({
      confirmedSeatCount: 2,
      heldSeatCount: 1,
      capacity: 10,
      minimumParticipants: 3,
    });
    bookingCount.mockResolvedValue(1);

    const { getWorkshopSessionParticipationSummaryForAdmin } = await import(
      "@/features/workshops/application/admin-workshop-bookings"
    );
    const summary = await getWorkshopSessionParticipationSummaryForAdmin("s1");
    expect(summary?.meetsMinimum).toBe(false);
    expect(summary?.confirmedSeatCount).toBe(2);
    expect(summary?.confirmedBookingCount).toBe(1);
  });
});
