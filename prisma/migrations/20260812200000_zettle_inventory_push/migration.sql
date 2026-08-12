-- Epic 6: Shop → Zettle inventory delta pushes (online sale / return)

CREATE TYPE "ZettleInventoryPushKind" AS ENUM ('shop_sale', 'shop_return');

CREATE TYPE "ZettleInventoryPushStatus" AS ENUM (
  'pending',
  'processed',
  'skipped',
  'failed'
);

CREATE TABLE "zettle_inventory_pushes" (
  "id" TEXT NOT NULL,
  "correlation_id" TEXT NOT NULL,
  "order_id" TEXT,
  "kind" "ZettleInventoryPushKind" NOT NULL,
  "status" "ZettleInventoryPushStatus" NOT NULL DEFAULT 'pending',
  "external_uuid" TEXT NOT NULL,
  "lines_json" JSONB NOT NULL,
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "zettle_inventory_pushes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zettle_inventory_pushes_correlation_id_key"
  ON "zettle_inventory_pushes"("correlation_id");

CREATE INDEX "zettle_inventory_pushes_status_created_at_idx"
  ON "zettle_inventory_pushes"("status", "created_at");

CREATE INDEX "zettle_inventory_pushes_order_id_idx"
  ON "zettle_inventory_pushes"("order_id");
