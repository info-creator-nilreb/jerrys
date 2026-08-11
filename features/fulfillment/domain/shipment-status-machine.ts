export const SHIPMENT_STATUSES = [
  "draft",
  "labeled",
  "shipped",
  "delivered",
  "voided",
  "returned",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

const SHIPMENT_EDGES: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  draft: ["labeled", "shipped", "voided"],
  labeled: ["shipped", "voided"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  voided: [],
  returned: [],
};

export function isAllowedShipmentTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  if (from === to) return false;
  return SHIPMENT_EDGES[from]?.includes(to) ?? false;
}

export function shipmentStatusLabel(status: ShipmentStatus): string {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "labeled":
      return "Label erstellt";
    case "shipped":
      return "Versandt";
    case "delivered":
      return "Zugestellt";
    case "voided":
      return "Storniert";
    case "returned":
      return "Retoure";
    default:
      return status;
  }
}

/** Terminale Zustände — keine weiteren Label-Käufe. */
export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return status === "voided" || status === "returned" || status === "delivered";
}
