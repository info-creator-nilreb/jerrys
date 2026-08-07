import { describe, expect, it } from "vitest";

describe("commerce maintenance route", () => {
  it("lehnt POST ohne Secret ab", async () => {
    const prev = process.env.COMMERCE_MAINTENANCE_SECRET;
    process.env.COMMERCE_MAINTENANCE_SECRET = "test-secret";
    try {
      const { POST } = await import("@/app/api/internal/commerce-maintenance/route");
      const req = new Request("http://127.0.0.1/api/internal/commerce-maintenance", {
        method: "POST",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(401);
    } finally {
      if (prev === undefined) delete process.env.COMMERCE_MAINTENANCE_SECRET;
      else process.env.COMMERCE_MAINTENANCE_SECRET = prev;
    }
  });

  it("lehnt GET ohne Secret ab", async () => {
    const prevMaint = process.env.COMMERCE_MAINTENANCE_SECRET;
    const prevCron = process.env.CRON_SECRET;
    process.env.COMMERCE_MAINTENANCE_SECRET = "test-secret";
    delete process.env.CRON_SECRET;
    try {
      const { GET } = await import("@/app/api/internal/commerce-maintenance/route");
      const req = new Request("http://127.0.0.1/api/internal/commerce-maintenance", {
        method: "GET",
      });
      const res = await GET(req as never);
      expect(res.status).toBe(401);
    } finally {
      if (prevMaint === undefined) delete process.env.COMMERCE_MAINTENANCE_SECRET;
      else process.env.COMMERCE_MAINTENANCE_SECRET = prevMaint;
      if (prevCron === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prevCron;
    }
  });
});
