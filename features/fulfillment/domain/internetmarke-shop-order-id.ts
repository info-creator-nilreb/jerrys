import { createHash } from "crypto";

/** DHL POST INTERNETMARKE: `shopOrderId` length 1–18, keine Zeichen `<` / `&`. */
export const INTERNETMARKE_SHOP_ORDER_ID_MAX = 18;

export function sanitizeInternetmarkeShopOrderId(raw: string): string {
  return raw.replace(/[<&]/g, "").trim().slice(0, INTERNETMARKE_SHOP_ORDER_ID_MAX);
}

function compactShipmentSuffix(shipmentId: string): string {
  return createHash("sha256").update(shipmentId).digest("hex").slice(0, 6);
}

/**
 * Stabile, provider-konforme shopOrderId pro Sendung (Idempotenz + Retoure).
 * Kombiniert lesbare Bestellnummer mit shipment-spezifischem Suffix.
 */
export function buildInternetmarkeShopOrderId(input: {
  shipmentId: string;
  orderNumber: string;
}): string {
  const suffix = compactShipmentSuffix(input.shipmentId);
  const orderPart = sanitizeInternetmarkeShopOrderId(input.orderNumber);

  if (orderPart.length > 0) {
    const maxOrderLen = INTERNETMARKE_SHOP_ORDER_ID_MAX - 1 - suffix.length;
    if (maxOrderLen >= 1) {
      return `${orderPart.slice(0, maxOrderLen)}-${suffix}`;
    }
  }

  return createHash("sha256")
    .update(input.shipmentId)
    .digest("hex")
    .slice(0, INTERNETMARKE_SHOP_ORDER_ID_MAX);
}
