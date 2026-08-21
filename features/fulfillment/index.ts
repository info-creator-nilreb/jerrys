export {
  SHIPMENT_STATUSES,
  isAllowedShipmentTransition,
  isTerminalShipmentStatus,
  shipmentStatusLabel,
  type ShipmentStatus,
} from "@/features/fulfillment/domain/shipment-status-machine";

export {
  evaluateOrderShipmentEligibility,
  type OrderShipmentEligibility,
  type OrderShipmentEligibilityInput,
} from "@/features/fulfillment/domain/order-eligible-for-shipment";

export {
  createNotConfiguredShippingLabelAdapter,
  type InternetmarkeVoucherLayout,
  type PurchaseShippingLabelInput,
  type PurchaseShippingLabelResult,
  type ShippingLabelAddress,
  type ShippingLabelPort,
  type ShippingLabelProviderId,
  type VoidShippingLabelInput,
  type VoidShippingLabelResult,
} from "@/features/fulfillment/application/shipping-label-port";

export {
  createShippingLabelPort,
  createShippingLabelPortFromEnv,
} from "@/features/fulfillment/application/create-shipping-label-port";

export {
  createShipmentDraftForOrder,
  type CreateShipmentDraftResult,
} from "@/features/fulfillment/application/create-shipment-draft-for-order";

export {
  createReshipmentDraftForOrder,
  type CreateReshipmentDraftResult,
} from "@/features/fulfillment/application/create-reshipment-draft-for-order";

export {
  markShipmentReturned,
  type MarkShipmentReturnedResult,
} from "@/features/fulfillment/application/mark-shipment-returned";

export {
  syncShipmentsOnOrderReturned,
  type SyncShipmentsOnOrderReturnedResult,
} from "@/features/fulfillment/application/sync-shipments-on-order-returned";

export {
  listShipmentsForOrder,
  type ShipmentListItem,
} from "@/features/fulfillment/application/list-shipments-for-order";

export {
  purchaseShippingLabelForShipment,
  type PurchaseShippingLabelForShipmentInput,
  type PurchaseShippingLabelForShipmentResult,
} from "@/features/fulfillment/application/purchase-shipping-label-for-shipment";

export {
  voidShippingLabelForShipment,
  type VoidShippingLabelForShipmentResult,
} from "@/features/fulfillment/application/void-shipping-label-for-shipment";

export {
  syncManualShipmentOnOrderShipped,
  type SyncManualShipmentOnOrderShippedResult,
} from "@/features/fulfillment/application/sync-manual-shipment-on-order-shipped";

export {
  INTERNETMARKE_PRESET_MAX,
  addInternetmarkeProductPreset,
  findInternetmarkeProductPreset,
  mergeLegacyInternetmarkeProduct,
  parseInternetmarkeProductPresets,
  removeInternetmarkeProductPreset,
  withUpdatedInternetmarkePresetPrice,
  type InternetmarkeProductPreset,
} from "@/features/fulfillment/domain/internetmarke-product-presets";

export {
  buildInternetmarkeSenderFromShopSettings,
  type BuildInternetmarkeSenderResult,
} from "@/features/fulfillment/application/build-internetmarke-sender";

export {
  getInternetmarkeConfig,
  getInternetmarkeConfigFromEnv,
  getInternetmarkeAppCredentialsFromEnv,
  getInternetmarkeAppCredentialsPublic,
  isInternetmarkeAppConfiguredFromEnv,
  isInternetmarkeConfigured,
  isInternetmarkeConfiguredFromEnv,
  resolveInternetmarkeConfig,
  INTERNETMARKE_API_BASE_URL,
  type InternetmarkeEnvConfig,
} from "@/features/fulfillment/infrastructure/internetmarke-config";

export {
  getInternetmarkeConnectionPublic,
  saveInternetmarkeConnection,
  saveInternetmarkePortokasseConnection,
  saveInternetmarkeProductPresets,
  updateInternetmarkeSelectedProduct,
  updateInternetmarkeProductPriceCents,
  updateInternetmarkePresetPriceCents,
  disconnectInternetmarkeConnection,
  getInternetmarkeConnectionSecrets,
  getInternetmarkePurchasePresets,
  markInternetmarkeConnectionError,
  markInternetmarkeConnectionVerified,
  type InternetmarkeConnectionPublic,
} from "@/features/fulfillment/infrastructure/internetmarke-connection";

export { InternetmarkeClient, InternetmarkeHttpError } from "@/features/fulfillment/infrastructure/internetmarke-client";

export {
  appendApiKeyDiagnostic,
  explainInternetmarkeAuthFailure,
  INTERNETMARKE_PORTOKASSE_URL,
  parseInternetmarkeErrorTitle,
} from "@/features/fulfillment/infrastructure/internetmarke-auth-error";

export {
  explainInternetmarkeCheckoutFailure,
  explainInternetmarkeRetoureFailure,
  formatInternetmarkeHttpErrorMessage,
} from "@/features/fulfillment/infrastructure/internetmarke-provider-error";

export {
  fetchInternetmarkeCatalogProducts,
  findInternetmarkeProductPriceCents,
  type InternetmarkeCatalogProduct,
} from "@/features/fulfillment/infrastructure/internetmarke-products-api";

export { createInternetmarkeShippingLabelAdapter } from "@/features/fulfillment/infrastructure/internetmarke-shipping-label-adapter";

export { toInternetmarkeCountryCode } from "@/features/fulfillment/infrastructure/internetmarke-country";
