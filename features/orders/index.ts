export {
  FULFILLMENT_STATUSES,
  fulfillmentStatusAfterOrderTransition,
  fulfillmentStatusLabel,
  isAllowedFulfillmentTransition,
  type FulfillmentStatus,
} from "@/features/orders/domain/fulfillment-status-machine";
export {
  isAllowedPaymentStatusTransition,
  isTerminalPaymentStatus,
} from "@/features/orders/domain/payment-status-machine";
