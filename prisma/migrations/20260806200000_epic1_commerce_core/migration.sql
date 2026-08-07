-- Epic 1: Commerce Core — Fulfillment-Achse, Bestandsreservierungen, Outbox/Inbox

CREATE TYPE "FulfillmentStatus" AS ENUM ('unfulfilled', 'preparing', 'shipped', 'delivered', 'returned');
CREATE TYPE "StockReservationStatus" AS ENUM ('active', 'committed', 'released', 'expired');
CREATE TYPE "StockMovementReason" AS ENUM (
  'reservation_hold',
  'reservation_release',
  'reservation_commit',
  'warehouse_ship',
  'warehouse_return',
  'manual_adjustment'
);
CREATE TYPE "IntegrationOutboxStatus" AS ENUM ('pending', 'published', 'failed');
CREATE TYPE "WebhookInboxStatus" AS ENUM ('received', 'processed', 'failed');

ALTER TABLE "orders" ADD COLUMN "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'unfulfilled';

UPDATE "orders" SET "fulfillment_status" = CASE
  WHEN "status" = 'processing' THEN 'preparing'::"FulfillmentStatus"
  WHEN "status" = 'shipped' THEN 'shipped'::"FulfillmentStatus"
  WHEN "status" = 'completed' THEN 'delivered'::"FulfillmentStatus"
  WHEN "status" = 'retoure' THEN 'returned'::"FulfillmentStatus"
  ELSE 'unfulfilled'::"FulfillmentStatus"
END;

CREATE TABLE "stock_reservations" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "StockReservationStatus" NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3),
  "committed_at" TIMESTAMP(3),
  "released_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_movements" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "order_id" TEXT,
  "reservation_id" TEXT,
  "quantity_delta" INTEGER NOT NULL,
  "reason" "StockMovementReason" NOT NULL,
  "correlation_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_outbox_messages" (
  "id" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "IntegrationOutboxStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3),

  CONSTRAINT "integration_outbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_inbox_entries" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "external_event_id" TEXT NOT NULL,
  "payload_hash" TEXT,
  "status" "WebhookInboxStatus" NOT NULL DEFAULT 'received',
  "metadata" JSONB,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),

  CONSTRAINT "webhook_inbox_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_reservations_order_id_product_id_key" ON "stock_reservations"("order_id", "product_id");
CREATE INDEX "stock_reservations_order_id_status_idx" ON "stock_reservations"("order_id", "status");
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");
CREATE INDEX "stock_movements_order_id_idx" ON "stock_movements"("order_id");
CREATE INDEX "integration_outbox_messages_status_created_at_idx" ON "integration_outbox_messages"("status", "created_at");
CREATE UNIQUE INDEX "webhook_inbox_entries_provider_external_event_id_key" ON "webhook_inbox_entries"("provider", "external_event_id");

ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "stock_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
