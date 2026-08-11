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
  type PurchaseShippingLabelInput,
  type PurchaseShippingLabelResult,
  type ShippingLabelPort,
  type ShippingLabelProviderId,
  type VoidShippingLabelInput,
  type VoidShippingLabelResult,
} from "@/features/fulfillment/application/shipping-label-port";

export {
  createShipmentDraftForOrder,
  type CreateShipmentDraftResult,
} from "@/features/fulfillment/application/create-shipment-draft-for-order";

export {
  listShipmentsForOrder,
  type ShipmentListItem,
} from "@/features/fulfillment/application/list-shipments-for-order";
