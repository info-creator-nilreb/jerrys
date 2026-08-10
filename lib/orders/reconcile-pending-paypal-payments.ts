import type { PrismaClient } from "@/app/generated/prisma/client";
import { completePayPalCaptureFlow } from "@/lib/checkout/complete-paypal-capture-flow";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";
import { getPayPalCheckoutOrderSnapshot } from "@/lib/payments/paypal-orders";

const log = createLogger("orders.paypal_reconcile");

export type PayPalReconcileOutcome =
  | "finalized"
  | "already_paid"
  | "still_open"
  | "provider_error"
  | "finalize_failed"
  | "skipped_unconfigured";

export type PayPalReconcileDetail = {
  orderId: string;
  orderNumber: string;
  paypalOrderId: string;
  outcome: PayPalReconcileOutcome;
  paypalStatus?: string;
  message?: string;
};

export type PayPalReconcileResult = {
  scanned: number;
  finalized: number;
  stillOpen: number;
  failed: number;
  skipped: number;
  details: PayPalReconcileDetail[];
};

/**
 * Gleicht intern `pending_payment` mit PayPal ab (QUALITY: extern erfolgreich / intern offen).
 * Finalisiert nur bei APPROVED/COMPLETED über denselben Capture-Flow (idempotent).
 */
export async function reconcilePendingPayPalPayments(
  prisma: PrismaClient,
  options?: {
    limit?: number;
    orderId?: string;
    /** Admin-Einzelaktion vs. Cron-Batch. */
    source?: "paypal_reconciliation" | "paypal_admin_reconcile";
  },
): Promise<PayPalReconcileResult> {
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
  const source = options?.source ?? "paypal_reconciliation";
  const details: PayPalReconcileDetail[] = [];

  if (!isPayPalConfigured()) {
    return {
      scanned: 0,
      finalized: 0,
      stillOpen: 0,
      failed: 0,
      skipped: 1,
      details: [
        {
          orderId: options?.orderId ?? "",
          orderNumber: "",
          paypalOrderId: "",
          outcome: "skipped_unconfigured",
          message: "PayPal ist nicht konfiguriert.",
        },
      ],
    };
  }

  const candidates = await prisma.order.findMany({
    where: {
      status: "pending_payment",
      ...(options?.orderId ? { id: options.orderId } : {}),
      payments: {
        some: {
          provider: "paypal",
          status: { in: ["pending", "processing"] },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      payments: {
        where: { provider: "paypal" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { providerRef: true, status: true },
      },
    },
  });

  let finalized = 0;
  let stillOpen = 0;
  let failed = 0;
  let skipped = 0;

  for (const order of candidates) {
    const paypalOrderId = order.payments[0]?.providerRef?.trim() ?? "";
    if (!paypalOrderId) {
      failed += 1;
      details.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        paypalOrderId: "",
        outcome: "provider_error",
        message: "Keine PayPal-Order-ID an der Zahlungszeile.",
      });
      continue;
    }

    let snapshot: Awaited<ReturnType<typeof getPayPalCheckoutOrderSnapshot>>;
    try {
      snapshot = await getPayPalCheckoutOrderSnapshot(paypalOrderId);
    } catch (e) {
      log.error("paypal_reconcile_get_failed", {
        orderId: order.id,
        paypalOrderId,
        ...errorMeta(e),
      });
      failed += 1;
      details.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        paypalOrderId,
        outcome: "provider_error",
        message: e instanceof Error ? e.message : "PayPal GET fehlgeschlagen.",
      });
      continue;
    }

    if (!snapshot.isCompleted && !snapshot.isApproved) {
      stillOpen += 1;
      details.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        paypalOrderId,
        outcome: "still_open",
        paypalStatus: snapshot.status,
      });
      continue;
    }

    const result = await completePayPalCaptureFlow(paypalOrderId, { eventSource: source });
    if (result.ok) {
      finalized += 1;
      details.push({
        orderId: order.id,
        orderNumber: result.orderNumber,
        paypalOrderId,
        outcome: "finalized",
        paypalStatus: snapshot.status,
      });
      log.info("paypal_reconcile_finalized", {
        orderId: order.id,
        paypalOrderId,
        source,
      });
    } else {
      // Zwischen GET und Capture kann Webhook längst `paid` gesetzt haben
      const fresh = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (fresh?.status === "paid") {
        skipped += 1;
        details.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          paypalOrderId,
          outcome: "already_paid",
          paypalStatus: snapshot.status,
        });
      } else {
        failed += 1;
        details.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          paypalOrderId,
          outcome: "finalize_failed",
          paypalStatus: snapshot.status,
          message: result.code,
        });
        log.error("paypal_reconcile_finalize_failed", {
          orderId: order.id,
          paypalOrderId,
          code: result.code,
        });
      }
    }
  }

  return {
    scanned: candidates.length,
    finalized,
    stillOpen,
    failed,
    skipped,
    details,
  };
}
