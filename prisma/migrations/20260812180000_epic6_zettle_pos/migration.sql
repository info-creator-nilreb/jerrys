-- Epic 6: Zettle POS connection, product mapping, purchase sync idempotency, stock reasons

ALTER TYPE "StockMovementReason" ADD VALUE 'pos_sale';
ALTER TYPE "StockMovementReason" ADD VALUE 'pos_refund';

CREATE TYPE "ZettlePurchaseSyncStatus" AS ENUM (
  'processed',
  'skipped',
  'failed',
  'pending_retry'
);

CREATE TABLE "zettle_connections" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "organization_uuid" TEXT,
  "client_id" TEXT NOT NULL,
  "api_key_enc" TEXT NOT NULL,
  "access_token_enc" TEXT,
  "access_token_expires_at" TIMESTAMP(3),
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_verified_at" TIMESTAMP(3),
  "last_purchase_sync_at" TIMESTAMP(3),
  "last_sync_error" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "zettle_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zettle_product_mappings" (
  "id" TEXT NOT NULL,
  "product_variant_id" TEXT NOT NULL,
  "zettle_product_uuid" TEXT NOT NULL,
  "zettle_variant_uuid" TEXT NOT NULL,
  "zettle_product_name" TEXT,
  "zettle_variant_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "zettle_product_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zettle_product_mappings_product_variant_id_key"
  ON "zettle_product_mappings"("product_variant_id");

CREATE UNIQUE INDEX "zettle_product_mappings_zettle_product_uuid_zettle_variant_uuid_key"
  ON "zettle_product_mappings"("zettle_product_uuid", "zettle_variant_uuid");

CREATE INDEX "zettle_product_mappings_zettle_variant_uuid_idx"
  ON "zettle_product_mappings"("zettle_variant_uuid");

ALTER TABLE "zettle_product_mappings"
  ADD CONSTRAINT "zettle_product_mappings_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "zettle_purchase_syncs" (
  "id" TEXT NOT NULL,
  "purchase_uuid" TEXT NOT NULL,
  "purchase_number" INTEGER,
  "purchased_at" TIMESTAMP(3),
  "status" "ZettlePurchaseSyncStatus" NOT NULL DEFAULT 'failed',
  "is_refund" BOOLEAN NOT NULL DEFAULT false,
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "zettle_purchase_syncs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zettle_purchase_syncs_purchase_uuid_key"
  ON "zettle_purchase_syncs"("purchase_uuid");

CREATE INDEX "zettle_purchase_syncs_status_created_at_idx"
  ON "zettle_purchase_syncs"("status", "created_at");
