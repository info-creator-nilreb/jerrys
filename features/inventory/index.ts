export type { ReservationLine } from "@/features/inventory/domain/reservation-line";
export { STOCK_RESERVATION_TTL_MS, reservationExpiresAt } from "@/features/inventory/domain/reservation-ttl";
export { InsufficientStockError, reserveStockForOrder } from "@/features/inventory/application/reserve-stock-for-order";
export { commitStockReservationsForOrder } from "@/features/inventory/application/commit-stock-reservations-for-order";
export { releaseStockReservationsForOrder } from "@/features/inventory/application/release-stock-reservations-for-order";
export { recordWarehouseShipmentMovements } from "@/features/inventory/application/record-warehouse-shipment-movements";
export { expireStaleStockReservations } from "@/features/inventory/application/expire-stale-stock-reservations";

export {
  applyPosRefundStockMovements,
  applyPosSaleStockMovements,
  type PosStockLine,
} from "@/features/inventory/application/apply-pos-stock-movements";

export {
  syncZettlePurchases,
  syncZettlePurchaseByUuid,
  applyZettlePurchase,
  retryFailedZettlePurchaseSyncs,
  listRecentZettlePurchaseSyncs,
  type SyncZettlePurchasesResult,
  type ApplyZettlePurchaseResult,
} from "@/features/inventory/application/sync-zettle-purchases";

export {
  ensureZettlePurchaseWebhook,
  removeZettlePurchaseWebhook,
  getZettleWebhookDestinationUrl,
} from "@/features/inventory/application/ensure-zettle-webhook";

export {
  buildZettleDiscrepancyReport,
  type ZettleDiscrepancyReport,
  type ZettleDiscrepancyRow,
} from "@/features/inventory/application/build-zettle-discrepancy-report";

export {
  buildZettleApiKeyDeepLink,
  getZettleAttributionClientId,
  getZettleConfigDiagnostics,
  ZETTLE_API_KEY_SCOPES,
  ZETTLE_CONNECTION_ID,
  ZETTLE_OAUTH_BASE_URL,
  ZETTLE_PRODUCT_API_BASE_URL,
  ZETTLE_PURCHASE_API_BASE_URL,
  ZETTLE_INVENTORY_API_BASE_URL,
  ZETTLE_PUSHER_API_BASE_URL,
} from "@/features/inventory/infrastructure/zettle-config";

export { parseZettleApiKeyClaims, type ZettleApiKeyClaims } from "@/features/inventory/infrastructure/zettle-api-key";

export { verifyZettleWebhookSignature } from "@/features/inventory/infrastructure/zettle-webhook-signature";

export { generateUuidV1 } from "@/features/inventory/infrastructure/zettle-uuid-v1";

export {
  getZettleConnectionPublic,
  getZettleConnectionSecrets,
  saveZettleApiKeyConnection,
  exchangeZettleApiKeyForToken,
  markZettleConnectionVerified,
  markZettleConnectionError,
  disconnectZettleConnection,
  saveZettleWebhookSubscription,
  clearZettleWebhookSubscription,
  type ZettleConnectionPublic,
} from "@/features/inventory/infrastructure/zettle-connection";

export {
  ZettleClient,
  createZettleClientFromConnection,
  type ZettleCatalogProduct,
  type ZettleCatalogVariant,
  type ZettlePurchase,
  type ZettleInventoryVariantBalance,
} from "@/features/inventory/infrastructure/zettle-client";

export {
  listShopVariantsForZettleMapping,
  upsertZettleProductMapping,
  deleteZettleProductMapping,
  type ZettleMappingRow,
} from "@/features/inventory/infrastructure/zettle-mapping";
