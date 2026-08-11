/**
 * Provider-neutraler Port für Versandlabels (Epic 7).
 * Slice 1: nur Vertrag + NotConfigured-Adapter — kein HTTP.
 */

export type ShippingLabelProviderId = "internetmarke" | "dhl_parcel";

export type PurchaseShippingLabelInput = {
  shipmentId: string;
  orderId: string;
  provider: ShippingLabelProviderId;
  /** Idempotenzschlüssel vom Aufrufer (z. B. shipmentId + attempt). */
  idempotencyKey: string;
};

export type PurchaseShippingLabelResult =
  | {
      ok: true;
      externalRef: string;
      trackingNumber: string | null;
      /** Später: privater Storage-Key / Bytes-Referenz. */
      labelStorageKey: string | null;
    }
  | {
      ok: false;
      error: "not_configured" | "not_implemented" | "provider_rejected" | "invalid_request";
      message: string;
    };

export type VoidShippingLabelInput = {
  shipmentId: string;
  provider: ShippingLabelProviderId;
  externalRef: string;
  idempotencyKey: string;
};

export type VoidShippingLabelResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_configured" | "not_implemented" | "provider_rejected" | "invalid_request";
      message: string;
    };

export type ShippingLabelPort = {
  purchaseLabel(input: PurchaseShippingLabelInput): Promise<PurchaseShippingLabelResult>;
  voidLabel(input: VoidShippingLabelInput): Promise<VoidShippingLabelResult>;
};

/** Standard bis Credentials + Adapter existieren. */
export function createNotConfiguredShippingLabelAdapter(): ShippingLabelPort {
  return {
    async purchaseLabel() {
      return {
        ok: false,
        error: "not_configured",
        message:
          "Kein Label-Anbieter konfiguriert. Manueller Versand mit Carrier und Tracking bleibt möglich.",
      };
    },
    async voidLabel() {
      return {
        ok: false,
        error: "not_configured",
        message: "Kein Label-Anbieter konfiguriert — Void nicht verfügbar.",
      };
    },
  };
}
