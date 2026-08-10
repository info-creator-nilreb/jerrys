import type { OrderPaymentStatus } from "@/app/generated/prisma/client";

export const PAYMENT_TERMINAL: ReadonlySet<OrderPaymentStatus> = new Set([
  "succeeded",
  "partially_refunded",
  "failed",
  "canceled",
  "refunded",
]);

export function isTerminalPaymentStatus(status: OrderPaymentStatus): boolean {
  return PAYMENT_TERMINAL.has(status);
}

/** Erlaubte PSP-Zahlungszeilen-Übergänge (Epic 1 / Epic 4 Refunds). */
const PAYMENT_EDGES: Partial<Record<OrderPaymentStatus, OrderPaymentStatus[]>> = {
  pending: ["processing", "succeeded", "failed", "canceled"],
  processing: ["succeeded", "failed", "canceled"],
  succeeded: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  failed: [],
  canceled: [],
  refunded: [],
};

export function isAllowedPaymentStatusTransition(
  from: OrderPaymentStatus,
  to: OrderPaymentStatus,
): boolean {
  if (from === to) return false;
  return PAYMENT_EDGES[from]?.includes(to) ?? false;
}
