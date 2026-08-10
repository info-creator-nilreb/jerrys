import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  issueOrderRefund,
  type IssueOrderRefundActor,
} from "@/lib/orders/issue-order-refund";

const log = createLogger("workshops.refund");

/**
 * Nach Workshop-Storno: PayPal-/Order-Erstattung anstoßen (best effort).
 * Storno der Buchung darf nicht an fehlgeschlagenem Refund scheitern.
 */
export async function tryRefundWorkshopBookingOrder(params: {
  bookingId: string;
  orderId: string | null | undefined;
  seatCount: number;
  unitPriceCentsSnapshot: number;
  actor: IssueOrderRefundActor;
}): Promise<{ attempted: boolean; ok: boolean; message?: string }> {
  if (!params.orderId) {
    return { attempted: false, ok: true };
  }
  const amountCents = params.seatCount * params.unitPriceCentsSnapshot;
  if (amountCents <= 0) {
    return { attempted: false, ok: true };
  }

  const idempotencyKey = `w${params.actor === "workshop_self_cancel" ? "s" : params.actor === "workshop_admin_cancel" ? "a" : "x"}-${params.bookingId}`.slice(
    0,
    38,
  );

  try {
    const result = await issueOrderRefund(getPrisma(), {
      orderId: params.orderId,
      amountCents,
      idempotencyKey,
      actor: params.actor,
      note: "Workshop-Storno",
    });
    if (!result.ok) {
      log.error("workshop_order_refund_failed", {
        bookingId: params.bookingId,
        orderId: params.orderId,
        error: result.error,
        message: result.message,
      });
      return { attempted: true, ok: false, message: result.message };
    }
    log.info("workshop_order_refund_ok", {
      bookingId: params.bookingId,
      orderId: params.orderId,
      amountCents: result.amountCents,
      alreadyProcessed: result.alreadyProcessed,
    });
    return { attempted: true, ok: true };
  } catch (e) {
    log.error("workshop_order_refund_exception", {
      bookingId: params.bookingId,
      orderId: params.orderId,
      ...errorMeta(e),
    });
    return {
      attempted: true,
      ok: false,
      message: "Erstattung konnte nicht automatisch ausgeführt werden.",
    };
  }
}
