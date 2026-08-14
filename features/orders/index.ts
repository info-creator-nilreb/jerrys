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
export {
  parseShopifyOrderCsv,
  parseShopifyMoneyToCents,
  type ShopifyParsedOrder,
} from "@/features/orders/domain/shopify-order-csv";
export {
  parseShopifyLineItemName,
  normalizeCatalogMatchText,
  matchOrderLineToCatalog,
  titleVariantMatchKey,
  type CatalogMatchIndex,
  type CatalogMatchEntry,
} from "@/features/orders/domain/order-line-catalog-match";
export {
  mapShopifyOrderToCatalog,
  mapShopifyOrdersToCatalog,
  mapShopifyOrderStatuses,
  shopifyOrderNumberFromName,
  shopifyIdempotencyKey,
  SHOPIFY_LEGACY_PRODUCT_SLUG,
  type CatalogImportOrder,
  type MapShopifyOrderOptions,
} from "@/features/orders/domain/shopify-order-map";
export { planShopifyOrderCsvImport } from "@/features/orders/application/import-shopify-orders-csv";
