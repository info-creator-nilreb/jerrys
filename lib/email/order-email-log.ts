import type { PrismaClient } from "@/app/generated/prisma/client";
import { isUniqueViolationError } from "@/lib/db/prisma-error";
import type { SendTransactionalResult } from "@/lib/email/provider";
import { createOrderEvent, ORDER_EVENT_EMAIL_DELIVERY } from "@/lib/orders/order-events";

const RETRYABLE_EMAIL_STATUSES = ["failed", "skipped_no_provider"] as const;

/**
 * Dedupe-Regel (Epic 5): Gleicher `emailType` pro Bestellung wird nach erfolgreichem Versand nicht erneut gesendet.
 * Fehlversuche (`failed`, `skipped_no_provider`) dürfen erneut versucht werden.
 */
export function isOrderEmailAlreadySentSuccessfully(log: { status: string } | null): boolean {
  return log?.status === "sent";
}

/** `sent` oder laufender Claim (`pending`) — parallele Sender überspringen. */
export function shouldSkipOrderEmailSend(log: { status: string } | null): boolean {
  return log?.status === "sent" || log?.status === "pending";
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

/**
 * Claim vor dem Versand (Unique `orderId`+`emailType`).
 * Verhindert Doppelversand, wenn Return-URL und Webhook parallel senden,
 * bevor die erste Zeile auf `sent` steht.
 */
export async function claimOrderEmailSend(
  prisma: PrismaClient,
  args: { orderId: string; emailType: string; toEmail: string },
): Promise<"claimed" | "already_claimed"> {
  const { orderId, emailType, toEmail } = args;
  try {
    await prisma.emailLog.create({
      data: { orderId, emailType, toEmail, status: "pending" },
    });
    return "claimed";
  } catch (error) {
    if (!isUniqueViolationError(error)) throw error;
    const existing = await prisma.emailLog.findUnique({
      where: { orderId_emailType: { orderId, emailType } },
    });
    if (!existing) throw error;
    if (shouldSkipOrderEmailSend(existing)) {
      return "already_claimed";
    }
    const recovered = await prisma.emailLog.updateMany({
      where: {
        orderId,
        emailType,
        status: { in: [...RETRYABLE_EMAIL_STATUSES] },
      },
      data: { status: "pending", errorMessage: null, providerId: null, toEmail },
    });
    if (recovered.count === 0) return "already_claimed";
    return "claimed";
  }
}

/** Gibt einen Claim frei, wenn die Mail doch nicht gesendet wird (z. B. Template aus). */
export async function releaseOrderEmailClaim(
  prisma: PrismaClient,
  args: { orderId: string; emailType: string },
): Promise<void> {
  await prisma.emailLog.deleteMany({
    where: {
      orderId: args.orderId,
      emailType: args.emailType,
      status: "pending",
    },
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
