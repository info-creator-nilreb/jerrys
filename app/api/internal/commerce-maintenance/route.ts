import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publishIntegrationOutboxBatch } from "@/features/integrations";
import { expireStaleStockReservations } from "@/features/inventory";
import { getPrisma } from "@/lib/db/prisma";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.COMMERCE_MAINTENANCE_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-commerce-maintenance-secret");
  return header === secret;
}

/**
 * POST — Reservierungs-Ablauf + Outbox-Publisher (Cron/Manual, Epic 1).
 * Erfordert `COMMERCE_MAINTENANCE_SECRET`.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const [expired, outbox] = await Promise.all([
    expireStaleStockReservations(prisma),
    publishIntegrationOutboxBatch(prisma),
  ]);

  return NextResponse.json({
    ok: true,
    expiredReservations: expired,
    outbox,
  });
}
