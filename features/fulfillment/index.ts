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

export { createShippingLabelPortFromEnv } from "@/features/fulfillment/application/create-shipping-label-port";

export {
  createShipmentDraftForOrder,
  type CreateShipmentDraftResult,
} from "@/features/fulfillment/application/create-shipment-draft-for-order";

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
  buildInternetmarkeSenderFromShopSettings,
  type BuildInternetmarkeSenderResult,
} from "@/features/fulfillment/application/build-internetmarke-sender";

export {
  getInternetmarkeConfig,
  isInternetmarkeConfigured,
  INTERNETMARKE_API_BASE_URL,
  type InternetmarkeEnvConfig,
} from "@/features/fulfillment/infrastructure/internetmarke-config";

export { createInternetmarkeShippingLabelAdapter } from "@/features/fulfillment/infrastructure/internetmarke-shipping-label-adapter";

export { toInternetmarkeCountryCode } from "@/features/fulfillment/infrastructure/internetmarke-country";
