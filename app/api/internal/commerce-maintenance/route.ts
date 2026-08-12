import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publishIntegrationOutboxBatch } from "@/features/integrations";
import {
  expireStaleStockReservations,
  getZettleConnectionPublic,
  syncZettlePurchases,
} from "@/features/inventory";
import { runWorkshopMaintenance } from "@/features/workshops";
import { getPrisma } from "@/lib/db/prisma";
import { getInstagramConnectionPublic } from "@/lib/instagram/connection";
import { syncInstagramMediaFeed } from "@/lib/instagram/sync-media";
import { reconcilePendingPayPalPayments } from "@/lib/orders/reconcile-pending-paypal-payments";

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization")?.trim();
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

function isAuthorized(req: NextRequest): boolean {
  const token = bearerToken(req);
  if (token) {
    const maintenance = process.env.COMMERCE_MAINTENANCE_SECRET?.trim();
    if (maintenance && token === maintenance) return true;
    const cron = process.env.CRON_SECRET?.trim();
    if (cron && token === cron) return true;
  }
  const header = req.headers.get("x-commerce-maintenance-secret")?.trim();
  const maintenance = process.env.COMMERCE_MAINTENANCE_SECRET?.trim();
  return Boolean(maintenance && header === maintenance);
}

async function runInstagramSyncIfConnected() {
  const conn = await getInstagramConnectionPublic();
  if (!conn.connected) {
    return { skipped: true as const, reason: "not_connected" };
  }
  const result = await syncInstagramMediaFeed();
  if (!result.ok) {
    return { skipped: false as const, ok: false as const, error: result.error };
  }
  return {
    skipped: false as const,
    ok: true as const,
    synced: result.synced,
    skippedMedia: result.skipped,
  };
}

async function runZettleSyncIfConnected() {
  const conn = await getZettleConnectionPublic();
  if (!conn.connected) {
    return { skipped: true as const, reason: "not_connected" };
  }
  try {
    const result = await syncZettlePurchases({ lookbackDays: 3, limit: 50 });
    return {
      skipped: false as const,
      ok: true as const,
      fetched: result.fetched,
      processed: result.processed,
      skippedPurchases: result.skipped,
      failed: result.failed,
    };
  } catch (e) {
    return {
      skipped: false as const,
      ok: false as const,
      error: e instanceof Error ? e.message : "zettle_sync_failed",
    };
  }
}

async function runCommerceMaintenance() {
  const prisma = getPrisma();
  const [expired, outbox, workshops, paypalReconcile, instagram, zettle] = await Promise.all([
    expireStaleStockReservations(prisma),
    publishIntegrationOutboxBatch(prisma),
    runWorkshopMaintenance(prisma),
    reconcilePendingPayPalPayments(prisma, {
      limit: 25,
      source: "paypal_reconciliation",
    }),
    runInstagramSyncIfConnected(),
    runZettleSyncIfConnected(),
  ]);
  return {
    expiredReservations: expired,
    outbox,
    workshops,
    paypalReconcile: {
      scanned: paypalReconcile.scanned,
      finalized: paypalReconcile.finalized,
      stillOpen: paypalReconcile.stillOpen,
      failed: paypalReconcile.failed,
      skipped: paypalReconcile.skipped,
    },
    instagram,
    zettle,
  };
}

/**
 * GET — Vercel Cron (sendet Authorization: Bearer CRON_SECRET).
 * Gleiche Logik wie POST; manuell testbar mit CRON_SECRET oder COMMERCE_MAINTENANCE_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await runCommerceMaintenance();
  return NextResponse.json({ ok: true, ...body });
}

/**
 * POST — Reservierungs-Ablauf + Workshop-Holds + Outbox + Zettle-Pull (manuell/Curl).
 * Erfordert COMMERCE_MAINTENANCE_SECRET (oder CRON_SECRET als Bearer).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await runCommerceMaintenance();
  return NextResponse.json({ ok: true, ...body });
}
