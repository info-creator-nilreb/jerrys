import { getPrisma } from "@/lib/db/prisma";
import {
  EMAIL_ORDER_CANCELLED,
  EMAIL_ORDER_CONFIRMATION,
  EMAIL_ORDER_REFUNDED,
  EMAIL_ORDER_SHIPPED,
} from "@/lib/email/email-types";
import { sendOrderCancelledIfNeeded } from "@/lib/email/order-cancelled";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { sendOrderRefundedIfNeeded } from "@/lib/email/order-refunded";
import { sendOrderShippedIfNeeded } from "@/lib/email/order-shipped";

const ADMIN_RESEND_TYPES = new Set<string>([
  EMAIL_ORDER_CONFIRMATION,
  EMAIL_ORDER_SHIPPED,
  EMAIL_ORDER_REFUNDED,
  EMAIL_ORDER_CANCELLED,
]);

export type AdminResendOrderEmailResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Erneuter Versand einer transaktionalen Bestell-Mail (Admin), inkl. Provider-Check über `email_logs`.
 */
export async function resendOrderEmailFromAdmin(
  orderId: string,
  emailType: string,
): Promise<AdminResendOrderEmailResult> {
  const id = orderId.trim();
  const type = emailType.trim();
  if (!id) return { ok: false, error: "Bestell-ID fehlt." };
  if (!ADMIN_RESEND_TYPES.has(type)) return { ok: false, error: "Unbekannter E-Mail-Typ." };

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { id: true } } },
  });
  if (!order) return { ok: false, error: "Bestellung nicht gefunden." };

  if (type === EMAIL_ORDER_CONFIRMATION) {
    if (order.status === "pending_payment") {
      return {
        ok: false,
        error: "Bestellbestätigung ist bei ausstehender Zahlung nicht versandbar.",
      };
    }
    if (order.items.length === 0) {
      return { ok: false, error: "Keine Positionen – Bestellbestätigung nicht versandbar." };
    }
  }

  if (type === EMAIL_ORDER_SHIPPED && order.items.length === 0) {
    return { ok: false, error: "Keine Positionen – Versand-Mail nicht versandbar." };
  }

  switch (type) {
    case EMAIL_ORDER_CONFIRMATION:
      await sendOrderConfirmationIfNeeded(id, { force: true });
      break;
    case EMAIL_ORDER_SHIPPED:
      await sendOrderShippedIfNeeded(id, { force: true });
      break;
    case EMAIL_ORDER_REFUNDED:
      await sendOrderRefundedIfNeeded(id, { force: true });
      break;
    case EMAIL_ORDER_CANCELLED:
      await sendOrderCancelledIfNeeded(id, { force: true });
      break;
    default:
      return { ok: false, error: "Unbekannter E-Mail-Typ." };
  }

  const log = await prisma.emailLog.findUnique({
    where: { orderId_emailType: { orderId: id, emailType: type } },
  });

  if (!log) {
    return { ok: false, error: "Kein Protokolleintrag – der Versand wurde nicht ausgeführt." };
  }

  if (log.status === "sent") {
    return { ok: true, message: "E-Mail wurde erneut versendet." };
  }
  if (log.status === "failed") {
    return { ok: false, error: log.errorMessage?.trim() || "Versand fehlgeschlagen." };
  }
  if (log.status === "skipped_no_provider") {
    return {
      ok: false,
      error: "Kein E-Mail-Versand konfiguriert (RESEND_API_KEY und MAIL_FROM in der Umgebung).",
    };
  }
  return { ok: false, error: `Versand nicht erfolgreich (Status: ${log.status}).` };
}
