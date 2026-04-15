/**
 * Erlaubte Bestellstatus und Wechsel (V1, deutsch/Shopware-orientierte Keys in der DB).
 */

export const ORDER_STATUSES = [
  "bestaetigt",
  "processing",
  "shipped",
  "retoure",
  "completed",
  "cancelled",
  "draft",
  "pending_payment",
  "paid",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TERMINAL = new Set<OrderStatus>(["completed", "cancelled", "refunded"]);

/** Von-Status → erlaubte Ziel-Status (nur explizit definierte Kanten). */
const EDGES: Partial<Record<string, string[]>> = {
  bestaetigt: ["processing", "cancelled"],
  pending_payment: ["cancelled", "paid"],
  paid: ["processing", "cancelled"],
  draft: ["cancelled", "pending_payment"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed", "cancelled", "retoure"],
  retoure: ["refunded", "completed", "cancelled"],
  completed: ["refunded", "retoure"],
  cancelled: [],
  refunded: [],
};

export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL.has(status as OrderStatus);
}

export function allowedNextOrderStatuses(current: string): string[] {
  return EDGES[current] ?? [];
}

export function isAllowedOrderStatusTransition(from: string, to: string): boolean {
  if (from === to) return false;
  return allowedNextOrderStatuses(from).includes(to);
}
