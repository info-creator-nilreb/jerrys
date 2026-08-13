import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getIntegrationOutboxBacklogStats,
  publishIntegrationOutboxBatch,
} from "@/features/integrations";
import {
  expireStaleStockReservations,
  getZettleConnectionPublic,
  processZettleInventoryPushes,
  syncZettlePurchases,
} from "@/features/inventory";
import { runWorkshopMaintenance } from "@/features/workshops";
import {
  parseCommerceMaintenanceMode,
  type CommerceMaintenanceMode,
} from "@/lib/commerce/maintenance-mode";
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
    const [result, pushes] = await Promise.all([
      syncZettlePurchases({ lookbackDays: 3, limit: 50 }),
      processZettleInventoryPushes({ limit: 40 }),
    ]);
    return {
      skipped: false as const,
      ok: true as const,
      fetched: result.fetched,
      processed: result.processed,
      skippedPurchases: result.skipped,
      failed: result.failed,
      inventoryPushes: pushes,
    };
  } catch (e) {
    return {
      skipped: false as const,
      ok: false as const,
      error: e instanceof Error ? e.message : "zettle_sync_failed",
    };
  }
}

async function resolveMaintenanceMode(req: NextRequest): Promise<CommerceMaintenanceMode> {
  const fromQuery = req.nextUrl.searchParams.get("mode");
  if (fromQuery) {
    return parseCommerceMaintenanceMode(fromQuery);
  }

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = (await req.clone().json()) as { mode?: unknown };
        if (typeof body?.mode === "string") {
          return parseCommerceMaintenanceMode(body.mode);
        }
      } catch {
        /* leerer/ungültiger Body → Default */
      }
    }
  }

  return "full";
}

async function runCommerceMaintenance(mode: CommerceMaintenanceMode) {
  const prisma = getPrisma();

  const [expired, workshops, paypalReconcile, outboxBacklog] = await Promise.all([
    expireStaleStockReservations(prisma),
    runWorkshopMaintenance(prisma),
    reconcilePendingPayPalPayments(prisma, {
      limit: 25,
      source: "paypal_reconciliation",
    }),
    getIntegrationOutboxBacklogStats(prisma),
  ]);

  const criticalBody = {
    mode,
    expiredReservations: expired,
    workshops,
    paypalReconcile: {
      scanned: paypalReconcile.scanned,
      finalized: paypalReconcile.finalized,
      stillOpen: paypalReconcile.stillOpen,
      failed: paypalReconcile.failed,
      skipped: paypalReconcile.skipped,
    },
    outboxBacklog,
  };

  if (mode === "critical") {
    return {
      ...criticalBody,
      outbox: { skipped: true as const, reason: "critical_mode" },
      instagram: { skipped: true as const, reason: "critical_mode" },
      zettle: { skipped: true as const, reason: "critical_mode" },
    };
  }

  const [outbox, instagram, zettle] = await Promise.all([
    publishIntegrationOutboxBatch(prisma),
    runInstagramSyncIfConnected(),
    runZettleSyncIfConnected(),
  ]);

  return {
    ...criticalBody,
    outbox,
    /** Nach Publisher erneut messen — Alert-Felder aktuell halten. */
    outboxBacklog: await getIntegrationOutboxBacklogStats(prisma),
    instagram,
    zettle,
  };
}

/**
 * GET — Vercel Cron (sendet Authorization: Bearer CRON_SECRET).
 * Query `?mode=critical|full` (Default: full). Manuell mit CRON_SECRET oder COMMERCE_MAINTENANCE_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const mode = await resolveMaintenanceMode(req);
  const body = await runCommerceMaintenance(mode);
  return NextResponse.json({ ok: true, ...body });
}

/**
 * POST — manuell/GitHub Actions.
 * `?mode=critical|full` oder JSON `{ "mode": "critical" }` (Default: full).
 * Erfordert COMMERCE_MAINTENANCE_SECRET (oder CRON_SECRET als Bearer).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const mode = await resolveMaintenanceMode(req);
  const body = await runCommerceMaintenance(mode);
  return NextResponse.json({ ok: true, ...body });
}
