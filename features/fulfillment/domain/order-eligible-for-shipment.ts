/**
 * Ob eine Bestellung eine physische Sendung bekommen darf (Slice 1 Heuristik).
 * Rein digitale/Workshop-only Orders ohne Warenpositionen brauchen keine Shipment.
 */

export type OrderShipmentEligibilityInput = {
  /** Aggregierter Bestellstatus (Legacy-String). */
  orderStatus: string;
  fulfillmentStatus: string;
  /** Summe physischer Positionen (Varianten mit Lager). */
  physicalItemQuantity: number;
  /**
   * Erneute Versendung nach Retoure:
   * erlaubt auch `shipped`/`retoure`/`completed`, solange nicht cancelled/refunded.
   */
  reship?: boolean;
};

export type OrderShipmentEligibility =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "no_physical_items"
        | "order_not_ready"
        | "already_fully_shipped"
        | "cancelled_or_refunded";
    };

const BLOCKED_ORDER_STATUSES = new Set(["cancelled", "refunded"]);

/** Status, in denen Admin eine erste Sendung vorbereiten darf. */
const READY_ORDER_STATUSES = new Set(["paid", "processing", "bestaetigt"]);

/** Status für Reship nach Retoure oder erneutem Versand. */
const RESHIP_ORDER_STATUSES = new Set([
  "paid",
  "processing",
  "bestaetigt",
  "shipped",
  "retoure",
  "completed",
]);

export function evaluateOrderShipmentEligibility(
  input: OrderShipmentEligibilityInput,
): OrderShipmentEligibility {
  if (input.physicalItemQuantity <= 0) {
    return { ok: false, reason: "no_physical_items" };
  }
  if (BLOCKED_ORDER_STATUSES.has(input.orderStatus)) {
    return { ok: false, reason: "cancelled_or_refunded" };
  }

  if (input.reship) {
    if (!RESHIP_ORDER_STATUSES.has(input.orderStatus)) {
      return { ok: false, reason: "order_not_ready" };
    }
    return { ok: true };
  }

  if (
    input.fulfillmentStatus === "shipped" ||
    input.fulfillmentStatus === "delivered"
  ) {
    return { ok: false, reason: "already_fully_shipped" };
  }
  if (input.orderStatus === "retoure") {
    return { ok: false, reason: "cancelled_or_refunded" };
  }
  if (!READY_ORDER_STATUSES.has(input.orderStatus)) {
    return { ok: false, reason: "order_not_ready" };
  }
  return { ok: true };
}
