import type { PrismaClient } from "@/app/generated/prisma/client";
import type { SendTransactionalResult } from "@/lib/email/provider";
import { createOrderEvent, ORDER_EVENT_EMAIL_DELIVERY } from "@/lib/orders/order-events";

/**
 * Dedupe-Regel (Epic 5): Gleicher `emailType` pro Bestellung wird nach erfolgreichem Versand nicht erneut gesendet.
 * Fehlversuche (`failed`, `skipped_no_provider`) dürfen erneut versucht werden.
 */
export function isOrderEmailAlreadySentSuccessfully(log: { status: string } | null): boolean {
  return log?.status === "sent";
}

export async function findOrderEmailLog(
  prisma: PrismaClient,
  orderId: string,
  emailType: string,
) {
  return prisma.emailLog.findUnique({
    where: { orderId_emailType: { orderId, emailType } },
  });
}

/** Protokolliert bzw. aktualisiert den Versandstatus (@@unique orderId + emailType). */
export async function upsertOrderEmailDeliveryLog(
  prisma: PrismaClient,
  args: {
    orderId: string;
    emailType: string;
    toEmail: string;
    result: SendTransactionalResult;
  },
): Promise<void> {
  const { orderId, emailType, toEmail, result } = args;
  await prisma.emailLog.upsert({
    where: { orderId_emailType: { orderId, emailType } },
    create: {
      orderId,
      emailType,
      toEmail,
      status: result.status,
      providerId: result.providerId ?? null,
      errorMessage: result.errorMessage ?? null,
    },
    update: {
      status: result.status,
      toEmail,
      providerId: result.providerId ?? null,
      errorMessage: result.errorMessage ?? null,
    },
  });

  await createOrderEvent(prisma, orderId, ORDER_EVENT_EMAIL_DELIVERY, {
    emailType,
    deliveryStatus: result.status,
  });
}
