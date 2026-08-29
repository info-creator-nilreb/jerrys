import { DELIVERY_TIME_OPTIONS } from "@/lib/catalog/delivery-options";

/** „2–4 Werktage“ → „in 2–4 Werktagen“ (Dativ für PDP-Satz). */
export function pdpDeliveryTimePhrase(label: string): string {
  const trimmed = label.trim();
  if (/werktage$/i.test(trimmed)) {
    return `in ${trimmed.replace(/werktage$/i, "Werktagen")}`;
  }
  return `in ${trimmed}`;
}

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
  return `Auf Lager – voraussichtlich ${pdpDeliveryTimePhrase(opt.label)} bei dir`;
}
