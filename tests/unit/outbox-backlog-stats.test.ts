import { describe, expect, it, vi } from "vitest";
import {
  getIntegrationOutboxBacklogStats,
  OUTBOX_STALE_PENDING_MS,
} from "@/features/integrations/application/outbox-backlog-stats";

describe("getIntegrationOutboxBacklogStats", () => {
  it("meldet leeren Backlog", async () => {
    const prisma = {
      integrationOutboxMessage: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const stats = await getIntegrationOutboxBacklogStats(prisma as never, {
      now: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(stats).toEqual({
      pendingCount: 0,
      stalePendingCount: 0,
      oldestPendingAgeSeconds: null,
      staleAfterSeconds: OUTBOX_STALE_PENDING_MS / 1000,
      publisher: "mvp_audit_mark_published",
    });
  });

  it("berechnet Alter und stalePendingCount", async () => {
    const now = new Date("2026-08-13T12:00:00.000Z");
    const oldest = new Date(now.getTime() - 20 * 60 * 1000);
    const count = vi
      .fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    const findFirst = vi.fn().mockResolvedValue({ createdAt: oldest });

    const prisma = {
      integrationOutboxMessage: { count, findFirst },
    };

    const stats = await getIntegrationOutboxBacklogStats(prisma as never, { now });

    expect(stats.pendingCount).toBe(3);
    expect(stats.stalePendingCount).toBe(1);
    expect(stats.oldestPendingAgeSeconds).toBe(20 * 60);
    expect(stats.publisher).toBe("mvp_audit_mark_published");
    expect(count).toHaveBeenCalledTimes(2);
  });
});
