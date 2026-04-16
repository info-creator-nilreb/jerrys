import type { ShippingCarrier } from "@/app/generated/prisma/client";

const DHL_BASE = "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html";
const DPD_BASE = "https://www.dpd.com/de/de/empfangen/sendungsverfolgung/";
const UPS_BASE = "https://www.ups.com/track";
const HERMES_BASE = "https://www.myhermes.de/empfangen/sendungsverfolgung/";

/**
 * Öffentliche Track-URLs (Stand 2026). Sendungsnummer URL-encoden.
 */
export function buildCarrierTrackingUrl(
  carrier: ShippingCarrier,
  trackingNumber: string,
): string | null {
  const t = trackingNumber.trim();
  if (!t) return null;
  const enc = encodeURIComponent(t);

  switch (carrier) {
    case "DHL":
      return `${DHL_BASE}?piececode=${enc}`;
    case "DPD":
      return `${DPD_BASE}?parcelNumber=${enc}`;
    case "UPS":
      return `${UPS_BASE}?tracknum=${enc}`;
    case "Hermes":
      return `${HERMES_BASE}?trackingNumber=${enc}`;
    default:
      return null;
  }
}

export function shippingCarrierLabel(carrier: ShippingCarrier): string {
  switch (carrier) {
    case "DHL":
      return "DHL";
    case "DPD":
      return "DPD";
    case "UPS":
      return "UPS";
    case "Hermes":
      return "Hermes";
    default:
      return carrier;
  }
}
