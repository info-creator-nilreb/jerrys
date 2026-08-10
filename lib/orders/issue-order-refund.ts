import type { OrderPaymentStatus, Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { isAllowedPaymentStatusTransition } from "@/features/orders";
import { applyOrderStatusTransition } from "@/lib/orders/apply-order-status-transition";
import {
  createOrderEvent,
  ORDER_EVENT_REFUNDED,
} from "@/lib/orders/order-events";
import { isAllowedOrderStatusTransition } from "@/lib/orders/order-status-machine";
import { sendOrderRefundedIfNeeded } from "@/lib/email/order-refunded";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  mergeOrderPaymentRefundMeta,
  readOrderPaymentRefundMeta,
  type OrderPaymentRefundEntry,
} from "@/lib/payments/order-payment-refund-meta";
import {
  refundPayPalCapture,
  resolvePayPalCaptureId,
} from "@/lib/payments/paypal-refunds";

const log = createLogger("orders.refund");

export type IssueOrderRefundActor =
  | "admin"
  | "workshop_self_cancel"
  | "workshop_admin_cancel"
  | "workshop_session_cancel"
  | "manual_mark";

export type IssueOrderRefundResult =
  | {
      ok: true;
      amountCents: number;
      remainingCents: number;
      full: boolean;
      provider: "paypal" | "manual";
      refundId: string | null;
      alreadyProcessed: boolean;
    }
  | {
      ok: false;
      error:
        | "not_found"
        | "not_refundable"
        | "invalid_amount"
        | "provider_failed"
        | "persist_failed";
      message: string;
    };

function nextPaymentStatus(full: boolean, from: OrderPaymentStatus): OrderPaymentStatus {
  if (full) return "refunded";
  if (from === "partially_refunded") return "partially_refunded";
  return "partially_refunded";
}

/**
 * Provider-bestätigte (PayPal) oder manuelle Erstattung einer Bestellung.
 * Statuswechsel auf `refunded` nur bei vollständiger Erstattung und erlaubter Transition.
 */
export async function issueOrderRefund(
  prisma: PrismaClient,
  params: {
    orderId: string;
    /** Ohne Angabe: Restbetrag der Capture-Zeile. */
    amountCents?: number;
    idempotencyKey: string;
    actor: IssueOrderRefundActor;
    note?: string;
    /** Nur Status/E-Mail ohne PSP (Vorkasse o. Ä., oder Admin-Override). */
    manualOnly?: boolean;
  },
): Promise<IssueOrderRefundResult> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) {
    return { ok: false, error: "not_found", message: "Bestellung nicht gefunden." };
  }

  if (order.status === "refunded") {
    return {
      ok: true,
      amountCents: 0,
      remainingCents: 0,
      full: true,
      provider: "manual",
      refundId: null,
      alreadyProcessed: true,
    };
  }

  const paypalPayment = order.payments.find(
    (p) =>
      p.provider === "paypal" &&
      (p.status === "succeeded" || p.status === "partially_refunded"),
  );

  if (paypalPayment && !params.manualOnly) {
    const meta = readOrderPaymentRefundMeta(paypalPayment.metadata);
    const already = meta.refunds?.find((r) => r.idempotencyKey === params.idempotencyKey);
    if (already) {
      const refundedCents = meta.refundedCents ?? already.amountCents;
      const remaining = Math.max(0, paypalPayment.amountGrossCents - refundedCents);
      return {
        ok: true,
        amountCents: already.amountCents,
        remainingCents: remaining,
        full: remaining === 0,
        provider: "paypal",
        refundId: already.id,
        alreadyProcessed: true,
      };
    }

    const refundedSoFar = meta.refundedCents ?? 0;
    const remaining = paypalPayment.amountGrossCents - refundedSoFar;
    if (remaining <= 0) {
      return {
        ok: false,
        error: "not_refundable",
        message: "Für diese Zahlung ist kein Restbetrag mehr erstattbar.",
      };
    }

    const amountCents = params.amountCents ?? remaining;
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > remaining) {
      return {
        ok: false,
        error: "invalid_amount",
        message: `Erstattungsbetrag muss zwischen 0,01 € und ${(remaining / 100).toFixed(2)} € liegen.`,
      };
    }

    let captureId = meta.paypalCaptureId ?? null;
    if (!captureId) {
      try {
        captureId = await resolvePayPalCaptureId(paypalPayment.providerRef);
      } catch (e) {
        log.error("paypal_capture_id_resolve_failed", {
          orderId: order.id,
          ...errorMeta(e),
        });
        return {
          ok: false,
          error: "provider_failed",
          message:
            "PayPal Capture-ID fehlt — Erstattung im PayPal-Dashboard prüfen oder Capture nachziehen.",
        };
      }
    }

    let refund: Awaited<ReturnType<typeof refundPayPalCapture>>;
    try {
      refund = await refundPayPalCapture({
        captureId,
        amountCents,
        currency: paypalPayment.currency || order.currency,
        requestId: params.idempotencyKey,
        note: params.note,
      });
    } catch (e) {
      log.error("paypal_refund_failed", { orderId: order.id, ...errorMeta(e) });
      return {
        ok: false,
        error: "provider_failed",
        message: e instanceof Error ? e.message : "PayPal-Erstattung fehlgeschlagen.",
      };
    }

    const newRefundedCents = refundedSoFar + refund.amountCents;
    const full = newRefundedCents >= paypalPayment.amountGrossCents;
    const entry: OrderPaymentRefundEntry = {
      id: refund.refundId,
      amountCents: refund.amountCents,
      idempotencyKey: params.idempotencyKey,
      at: new Date().toISOString(),
      actor: params.actor,
      ...(params.note?.trim() ? { note: params.note.trim().slice(0, 255) } : {}),
    };
    const nextStatus = nextPaymentStatus(full, paypalPayment.status);
    if (
      nextStatus !== paypalPayment.status &&
      !isAllowedPaymentStatusTransition(paypalPayment.status, nextStatus) &&
      !(paypalPayment.status === "partially_refunded" && nextStatus === "partially_refunded")
    ) {
      return {
        ok: false,
        error: "persist_failed",
        message: "Zahlungsstatus-Übergang für Erstattung ist nicht erlaubt.",
      };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.orderPayment.findUnique({ where: { id: paypalPayment.id } });
        if (!fresh) throw new Error("payment_missing");
        const freshMeta = readOrderPaymentRefundMeta(fresh.metadata);
        if (freshMeta.refunds?.some((r) => r.idempotencyKey === params.idempotencyKey)) {
          return;
        }
        const refunds = [...(freshMeta.refunds ?? []), entry];
        await tx.orderPayment.update({
          where: { id: fresh.id },
          data: {
            status: nextStatus,
            metadata: mergeOrderPaymentRefundMeta(fresh.metadata, {
              paypalCaptureId: captureId ?? undefined,
              refundedCents: newRefundedCents,
              refunds,
            }) as Prisma.InputJsonValue,
          },
        });

        await createOrderEvent(tx, order.id, ORDER_EVENT_REFUNDED, {
          amountCents: refund.amountCents,
          refundId: refund.refundId,
          provider: "paypal",
          actor: params.actor,
          full,
          idempotencyKey: params.idempotencyKey,
        });
      });
    } catch (e) {
      log.error("paypal_refund_persist_failed", { orderId: order.id, ...errorMeta(e) });
      return {
        ok: false,
        error: "persist_failed",
        message:
          "PayPal hat erstattet, aber der Shop-Status konnte nicht gespeichert werden. Bitte Support prüfen.",
      };
    }

    if (full && isAllowedOrderStatusTransition(order.status, "refunded")) {
      const transition = await applyOrderStatusTransition(prisma, order.id, "refunded");
      if (!transition.ok) {
        log.error("order_refund_status_failed", {
          orderId: order.id,
          error: transition.error,
        });
      }
    } else if (full && order.status !== "refunded") {
      // E-Mail auch ohne Statuswechsel (z. B. bereits cancelled)
      try {
        await sendOrderRefundedIfNeeded(order.id);
      } catch (e) {
        log.error("refund_email_failed", { orderId: order.id, ...errorMeta(e) });
      }
    }

    return {
      ok: true,
      amountCents: refund.amountCents,
      remainingCents: Math.max(0, paypalPayment.amountGrossCents - newRefundedCents),
      full,
      provider: "paypal",
      refundId: refund.refundId,
      alreadyProcessed: false,
    };
  }

  // Manuell / ohne PayPal-Capture (Vorkasse, Demo, Override)
  if (params.manualOnly || !paypalPayment) {
    if (params.amountCents != null && params.amountCents !== order.totalGrossCents) {
      return {
        ok: false,
        error: "invalid_amount",
        message:
          "Ohne PayPal-Zahlung sind nur vollständige manuelle Erstattungen (Bestellbetrag) möglich.",
      };
    }
    if (!isAllowedOrderStatusTransition(order.status, "refunded")) {
      return {
        ok: false,
        error: "not_refundable",
        message: "Statuswechsel auf „erstattet“ ist für diese Bestellung nicht erlaubt.",
      };
    }
    const transition = await applyOrderStatusTransition(prisma, order.id, "refunded");
    if (!transition.ok) {
      return {
        ok: false,
        error: "persist_failed",
        message: "Manuelle Erstattung konnte nicht gespeichert werden.",
      };
    }
    await createOrderEvent(prisma, order.id, ORDER_EVENT_REFUNDED, {
      amountCents: order.totalGrossCents,
      provider: "manual",
      actor: params.actor,
      full: true,
      idempotencyKey: params.idempotencyKey,
    });
    return {
      ok: true,
      amountCents: order.totalGrossCents,
      remainingCents: 0,
      full: true,
      provider: "manual",
      refundId: null,
      alreadyProcessed: false,
    };
  }

  return {
    ok: false,
    error: "not_refundable",
    message: "Keine erstattbare Zahlung gefunden.",
  };
}
