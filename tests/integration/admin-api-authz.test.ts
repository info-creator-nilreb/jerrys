import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Neue geschützte Routen unter `app/api/admin/**`: hier einen Negative-Test ergänzen
 * und `docs/SECURITY_SURFACE.md` pflegen (siehe `security-surface-manifest.test.ts`).
 */
const authMock = vi.fn();
vi.mock("@/auth", () => ({
  auth: authMock,
}));

describe("Admin-API ohne Session", () => {
  beforeEach(() => {
    authMock.mockResolvedValue(null);
  });

  it("GET /api/admin/search antwortet 401", async () => {
    const { GET: adminSearchGet } = await import("@/app/api/admin/search/route");
    const req = new NextRequest("http://127.0.0.1/api/admin/search?q=test");
    const res = await adminSearchGet(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/order-alerts antwortet 401", async () => {
    const { GET: orderAlertsGet } = await import("@/app/api/admin/order-alerts/route");
    const req = new NextRequest("http://127.0.0.1/api/admin/order-alerts?since=2020-01-01T00:00:00.000Z");
    const res = await orderAlertsGet(req);
    expect(res.status).toBe(401);
  });
});
