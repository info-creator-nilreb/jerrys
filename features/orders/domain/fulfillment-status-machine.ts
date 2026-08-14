export const FULFILLMENT_STATUSES = [
  "unfulfilled",
  "preparing",
  "shipped",
  "delivered",
  "returned",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

const FULFILLMENT_EDGES: Partial<Record<FulfillmentStatus, FulfillmentStatus[]>> = {
  unfulfilled: ["preparing"],
  preparing: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
};

export function isAllowedFulfillmentTransition(
  from: FulfillmentStatus,
  to: FulfillmentStatus,
): boolean {
  if (from === to) return false;
  return FULFILLMENT_EDGES[from]?.includes(to) ?? false;
}

/** Leitet den Fulfillment-Status aus einem Bestellstatus-Wechsel ab (Legacy-Kompatibilität). */
export function fulfillmentStatusAfterOrderTransition(
  toOrderStatus: string,
): FulfillmentStatus | null {
  switch (toOrderStatus) {
    case "processing":
      return "preparing";
    case "shipped":
      return "shipped";
    case "abgeholt":
      return "delivered";
    case "completed":
      return "delivered";
    case "retoure":
      return "returned";
    default:
      return null;
  }
}

export function fulfillmentStatusLabel(status: FulfillmentStatus): string {
  switch (status) {
    case "unfulfilled":
      return "Offen";
    case "preparing":
      return "In Bearbeitung";
    case "shipped":
      return "Versandt";
    case "delivered":
      return "Zugestellt";
    case "returned":
      return "Retoure";
    default:
      return status;
  }
}
