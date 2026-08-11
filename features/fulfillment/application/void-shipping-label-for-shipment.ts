import type { PrismaClient } from "@/app/generated/prisma/client";
import type { ShippingLabelPort } from "@/features/fulfillment/application/shipping-label-port";
import { isAllowedShipmentTransition } from "@/features/fulfillment/domain/shipment-status-machine";

export type VoidShippingLabelForShipmentResult =
  | { ok: true; shipmentId: string; shopRetoureId: string | null }
  | {
      ok: false;
      error:
        | "not_found"
        | "invalid_status"
        | "missing_external_ref"
        | "not_configured"
        | "not_implemented"
        | "provider_rejected"
        | "invalid_request";
      message: string;
    };

/**
 * Void/Retoure eines gekauften Labels (INTERNETMARKE POST /app/retoure).
 * Setzt Shipment → voided nur bei Provider-Erfolg.
 */
export async function voidShippingLabelForShipment(
  prisma: PrismaClient,
  port: ShippingLabelPort,
  shipmentId: string,
  options?: { idempotencyKey?: string },
): Promise<VoidShippingLabelForShipmentResult> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      status: true,
      labelProvider: true,
      labelExternalRef: true,
    },
  });

  if (!shipment) {
    return { ok: false, error: "not_found", message: "Sendung nicht gefunden." };
  }

  if (!isAllowedShipmentTransition(shipment.status, "voided")) {
    return {
      ok: false,
      error: "invalid_status",
      message: `Sendung im Status „${shipment.status}“ kann nicht storniert werden.`,
    };
  }

  if (shipment.labelProvider === "none" || !shipment.labelExternalRef) {
    // Manueller Draft ohne Label: lokal voiden ohne Provider.
    if (shipment.status === "draft") {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: "voided", voidedAt: new Date() },
      });
      return { ok: true, shipmentId: shipment.id, shopRetoureId: null };
    }
    return {
      ok: false,
      error: "missing_external_ref",
      message: "Keine Provider-Referenz — Retoure beim Anbieter nicht möglich.",
    };
  }

  if (shipment.labelProvider !== "internetmarke") {
    return {
      ok: false,
      error: "not_implemented",
      message: `Void für Provider ${shipment.labelProvider} ist noch nicht implementiert.`,
    };
  }

  const voided = await port.voidLabel({
    shipmentId: shipment.id,
    provider: "internetmarke",
    externalRef: shipment.labelExternalRef,
    idempotencyKey: options?.idempotencyKey?.trim() || `void:${shipment.id}`,
  });

  if (!voided.ok) {
    return {
      ok: false,
      error: voided.error,
      message: voided.message,
    };
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: "voided",
      voidedAt: new Date(),
    },
  });

  return {
    ok: true,
    shipmentId: shipment.id,
    shopRetoureId: voided.shopRetoureId ?? null,
  };
}
