/**
 * Erlaubte Bestellstatus und Wechsel (V1, deutsch/Shopware-orientierte Keys in der DB).
 */

export const ORDER_STATUSES = [
  "bestaetigt",
  "processing",
  "shipped",
  "abgeholt",
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
  paid: ["processing", "cancelled", "refunded"],
  draft: ["cancelled", "pending_payment"],
  processing: ["shipped", "abgeholt", "cancelled", "refunded"],
  shipped: ["completed", "cancelled", "retoure", "refunded"],
  abgeholt: ["completed", "cancelled", "retoure", "refunded"],
  /** `processing` = Vorbereitung erneuter Versand (Reship nach Retoure). */
  retoure: ["refunded", "completed", "cancelled", "processing"],

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

/** Versand oder Abholung: Lager wird beim Verlassen des Bestands verringert. */
export function orderStatusDecrementsWarehouse(status: string): boolean {
  return status === "shipped" || status === "abgeholt";
}

/**
 * Zahlung ist serverseitig eingegangen (nicht nur Checkout gestartet).
 * Erfolgseite, 409-„bereits bezahlt“ und Bestellbestätigung nur in diesen Status.
 */
export function orderPaymentCaptured(status: string): boolean {
  switch (status) {
    case "paid":
    case "bestaetigt":
    case "processing":
    case "shipped":
    case "abgeholt":
    case "completed":
    case "retoure":
    case "refunded":
      return true;
    default:
      return false;
  }
}
