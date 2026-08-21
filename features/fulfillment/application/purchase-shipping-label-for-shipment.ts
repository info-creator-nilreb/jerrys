import type { PrismaClient } from "@/app/generated/prisma/client";
import type {
  InternetmarkeVoucherLayout,
  ShippingLabelAddress,
  ShippingLabelPort,
} from "@/features/fulfillment/application/shipping-label-port";
import { buildInternetmarkeShopOrderId } from "@/features/fulfillment/domain/internetmarke-shop-order-id";
import { isAllowedShipmentTransition } from "@/features/fulfillment/domain/shipment-status-machine";

export type PurchaseShippingLabelForShipmentInput = {
  shipmentId: string;
  sender: ShippingLabelAddress;
  /** Override Env-Produkt; sonst INTERNETMARKE_PRODUCT_*. */
  productCode?: number;
  totalCents?: number;
  pageFormatId?: number;
  voucherLayout?: InternetmarkeVoucherLayout;
  /**
   * Stabile Idempotenz — Default: provider-konforme shopOrderId aus Bestellnummer + Sendung.
   * Bei erneutem Aufruf mit derselben ID kauft der Provider idealerweise nicht doppelt
   * (shopOrderId); lokaler Short-Circuit wenn bereits labeled + gleiche Ref.
   */
  idempotencyKey?: string;
};

export type PurchaseShippingLabelForShipmentResult =
  | {
      ok: true;
      shipmentId: string;
      externalRef: string;
      trackingNumber: string | null;
      labelDownloadUrl: string | null;
      alreadyLabeled: boolean;
    }
  | {
      ok: false;
      error:
        | "not_found"
        | "invalid_status"
        | "not_configured"
        | "not_implemented"
        | "provider_rejected"
        | "invalid_request";
      message: string;
    };

function receiverFromOrder(order: {
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany: string | null;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
}): ShippingLabelAddress {
  return {
    name: `${order.shippingFirstName} ${order.shippingLastName}`.trim(),
    additionalName: order.shippingCompany,
    addressLine1: order.shippingLine1,
    addressLine2: order.shippingLine2,
    postalCode: order.shippingZip,
    city: order.shippingCity,
    country: order.shippingCountry,
  };
}

/**
 * Kauft ein Label für einen Shipment-Draft und setzt Status → labeled.
 * Zahlung/Order-Status bleiben unberührt (ADR-0009).
 */
export async function purchaseShippingLabelForShipment(
  prisma: PrismaClient,
  port: ShippingLabelPort,
  input: PurchaseShippingLabelForShipmentInput,
): Promise<PurchaseShippingLabelForShipmentResult> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: input.shipmentId },
    select: {
      id: true,
      orderId: true,
      status: true,
      labelProvider: true,
      labelExternalRef: true,
      trackingNumber: true,
      order: {
        select: {
          orderNumber: true,
          shippingFirstName: true,
          shippingLastName: true,
          shippingCompany: true,
          shippingLine1: true,
          shippingLine2: true,
          shippingZip: true,
          shippingCity: true,
          shippingCountry: true,
        },
      },
    },
  });

  if (!shipment) {
    return { ok: false, error: "not_found", message: "Sendung nicht gefunden." };
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    buildInternetmarkeShopOrderId({
      shipmentId: shipment.id,
      orderNumber: shipment.order.orderNumber,
    });

  if (shipment.status === "labeled" && shipment.labelExternalRef) {
    return {
      ok: true,
      alreadyLabeled: true,
      shipmentId: shipment.id,
      externalRef: shipment.labelExternalRef,
      trackingNumber: shipment.trackingNumber,
      labelDownloadUrl: null,
    };
  }

  if (!isAllowedShipmentTransition(shipment.status, "labeled")) {
    return {
      ok: false,
      error: "invalid_status",
      message: `Sendung im Status „${shipment.status}“ kann kein Label erhalten.`,
    };
  }

  const purchased = await port.purchaseLabel({
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    provider: "internetmarke",
    idempotencyKey,
    shopOrderId: idempotencyKey,
    sender: input.sender,
    receiver: receiverFromOrder(shipment.order),
    productCode: input.productCode,
    totalCents: input.totalCents,
    pageFormatId: input.pageFormatId,
    voucherLayout: input.voucherLayout,
  });

  if (!purchased.ok) {
    return {
      ok: false,
      error: purchased.error,
      message: purchased.message,
    };
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: "labeled",
      labelProvider: "internetmarke",
      labelExternalRef: purchased.externalRef,
      trackingNumber: purchased.trackingNumber,
      // TODO(Epic 7): Privater Object-Store für Label-PDF — Provider-URL ist ephemeral;
      // nach Kauf PDF laden, dauerhaft speichern, hier labelStorageKey setzen + Admin-Download-Route.
      labelStorageKey: purchased.labelStorageKey,
      labelPurchasedAt: new Date(),
    },
  });

  return {
    ok: true,
    alreadyLabeled: false,
    shipmentId: shipment.id,
    externalRef: purchased.externalRef,
    trackingNumber: purchased.trackingNumber,
    labelDownloadUrl: purchased.labelDownloadUrl,
  };
}
