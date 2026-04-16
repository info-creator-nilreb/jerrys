import type { PrismaClient } from "@/app/generated/prisma/client";
import { allocateNextInvoiceNumber } from "@/lib/invoice/allocate-invoice-number";

/** Keine Rechnung für reine Anfragen / stornierte oder erstattete Bestellungen. */
const INVOICE_BLOCKED_STATUSES = new Set([
  "cancelled",
  "refunded",
  "draft",
  "pending_payment",
]);

export function isInvoiceAllocationAllowedForOrderStatus(status: string): boolean {
  return !INVOICE_BLOCKED_STATUSES.has(status);
}

/**
 * Vergibt eine Rechnungsnummer und speichert sie an der Bestellung, falls noch keine existiert.
 * Wird bei „Versand melden“ nicht erneut vergeben, wenn hier bereits eine Nummer gesetzt wurde.
 */
export async function allocateInvoiceForOrderIfMissing(
  prisma: PrismaClient,
  orderId: string,
): Promise<
  | { ok: true; invoiceNumber: string; created: boolean }
  | { ok: false; error: "not_found" | "blocked" }
> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return { ok: false, error: "not_found" } as const;
    }
    if (order.invoiceNumber) {
      return { ok: true, invoiceNumber: order.invoiceNumber, created: false };
    }
    if (INVOICE_BLOCKED_STATUSES.has(order.status)) {
      return { ok: false, error: "blocked" } as const;
    }

    const inv = await allocateNextInvoiceNumber(tx);
    await tx.order.update({
      where: { id: orderId },
      data: { invoiceNumber: inv.invoiceNumber, invoiceIssuedAt: inv.issuedAt },
    });
    return { ok: true, invoiceNumber: inv.invoiceNumber, created: true };
  });
}
