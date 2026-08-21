/**
 * Provider-neutraler Port für Versandlabels (Epic 7).
 * Slice 3: INTERNETMARKE-Adapter hinter dem Port; ohne Credentials → NotConfigured.
 */

export type ShippingLabelProviderId = "internetmarke" | "dhl_parcel";

/** Adresse für Label-Kauf (ISO-3166-1 alpha-2 oder alpha-3). */
export type ShippingLabelAddress = {
  name: string;
  additionalName?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
};

export type InternetmarkeVoucherLayout = "ADDRESS_ZONE" | "FRANKING_ZONE";

export type PurchaseShippingLabelInput = {
  shipmentId: string;
  orderId: string;
  provider: ShippingLabelProviderId;
  /** Idempotenzschlüssel vom Aufrufer (z. B. shipmentId + attempt). */
  idempotencyKey: string;
  /**
   * Stabile Shop-Order-ID für den Provider (1–18 Zeichen, keine `<` / `&`).
   * Default: idempotencyKey.
   */
  shopOrderId?: string;
  sender: ShippingLabelAddress;
  receiver: ShippingLabelAddress;
  /** INTERNETMARKE Produktcode (PPL / Products API). */
  productCode?: number;
  /** Porto in Euro-Cent (muss zum Produktpreis passen). */
  totalCents?: number;
  pageFormatId?: number;
  voucherLayout?: InternetmarkeVoucherLayout;
};

export type PurchaseShippingLabelResult =
  | {
      ok: true;
      externalRef: string;
      trackingNumber: string | null;
      /** Später: privater Storage-Key; bis dahin oft temporärer PDF-Link. */
      labelStorageKey: string | null;
      /** Temporärer Download-Link vom Provider (nicht dauerhaft speichern als Wahrheit). */
      labelDownloadUrl: string | null;
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
  | { ok: true; shopRetoureId?: string | null }
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
