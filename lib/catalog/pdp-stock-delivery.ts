import { DELIVERY_TIME_OPTIONS } from "@/lib/catalog/delivery-options";

/**
 * Kurzer Lager-/Liefer-Hinweis für die Produktdetailseite (Shop-Sprache).
 */
export function pdpStockDeliveryLine(input: {
  availableQuantity: number;
  deliveryTimeKey: string | null;
}): string {
  if (input.availableQuantity <= 0) {
    return "Derzeit nicht auf Lager.";
  }
  const opt = DELIVERY_TIME_OPTIONS.find((o) => o.value === input.deliveryTimeKey);
  if (!opt) {
    return "Auf Lager – Lieferzeit folgt mit der Bestellbestätigung.";
  }
  return `Auf Lager – voraussichtlich ${opt.label} bei dir`;
}
