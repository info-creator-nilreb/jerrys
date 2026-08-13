import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyEvents = vi.fn();
const findManyRequests = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    workshopBookingEvent: { findMany: findManyEvents },
    workshopDateRequest: { findMany: findManyRequests },
  }),
}));

vi.mock("@/lib/db/prisma-error", () => ({
  isMissingSchemaError: () => false,
}));

import {
  listWorkshopBookingsConfirmedAfter,
  listWorkshopDateRequestsCreatedAfter,
} from "@/lib/admin/workshop-alerts";
import { WORKSHOP_BOOKING_EVENT_CONFIRMED } from "@/features/workshops/application/workshop-booking-events";

describe("workshop alerts", () => {
  beforeEach(() => {
    findManyEvents.mockReset();
    findManyRequests.mockReset();
  });

  it("listet bestätigte Buchungen über Confirm-Events", async () => {
    const since = new Date("2026-08-01T00:00:00.000Z");
    findManyEvents.mockResolvedValue([
      {
        id: "ev1",
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
        booking: {
          id: "b1",
          sessionId: "s1",
          contactEmail: "a@b.co",
          seatCount: 2,
          sessionTitleSnapshot: "Workshop",
          sessionStartsAtSnapshot: new Date("2026-08-10T18:00:00.000Z"),
          unitPriceCentsSnapshot: 2500,
          currencySnapshot: "EUR",
          status: "confirmed",
        },
      },
    ]);

    const rows = await listWorkshopBookingsConfirmedAfter(since);
    expect(findManyEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: WORKSHOP_BOOKING_EVENT_CONFIRMED,
          createdAt: { gt: since },
        }),
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      bookingId: "b1",
      sessionId: "s1",
      seatCount: 2,
      sessionTitle: "Workshop",
    });
  });

  it("listet neue Wunschtermine", async () => {
    const since = new Date("2026-08-01T00:00:00.000Z");
    findManyRequests.mockResolvedValue([
      {
        id: "r1",
        contactEmail: "w@x.de",
        contactName: "Ada",
        seatCount: 1,
        preferredStartsAt: new Date("2026-09-01T10:00:00.000Z"),
        createdAt: new Date("2026-08-02T12:00:00.000Z"),
      },
    ]);

    const rows = await listWorkshopDateRequestsCreatedAfter(since);
    expect(rows[0]).toMatchObject({
      id: "r1",
      contactName: "Ada",
      contactEmail: "w@x.de",
    });
  });
});
