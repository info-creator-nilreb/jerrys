-- Epic 2: Product variants, collections, variant-scoped cart/reservations

CREATE TABLE "product_variants" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "title" TEXT,
  "price_gross_cents" INTEGER NOT NULL,
  "price_net_cents" INTEGER NOT NULL,
  "tax_rate_percent" INTEGER NOT NULL DEFAULT 19,
  "list_price_gross_cents" INTEGER,
  "list_price_net_cents" INTEGER,
  "lowest_price_30d_gross_cents" INTEGER,
  "lowest_price_30d_net_cents" INTEGER,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "available_quantity" INTEGER NOT NULL DEFAULT 0,
  "delivery_time_key" TEXT,
  "restock_days" INTEGER,
  "min_order_qty" INTEGER NOT NULL DEFAULT 1,
  "purchase_step" INTEGER NOT NULL DEFAULT 1,
  "max_order_qty" INTEGER,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collections" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collection_products" (
  "collection_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "collection_products_pkey" PRIMARY KEY ("collection_id", "product_id")
);

INSERT INTO "product_variants" (
  "id",
  "product_id",
  "sku",
  "price_gross_cents",
  "price_net_cents",
  "tax_rate_percent",
  "list_price_gross_cents",
  "list_price_net_cents",
  "lowest_price_30d_gross_cents",
  "lowest_price_30d_net_cents",
  "stock_quantity",
  "available_quantity",
  "delivery_time_key",
  "restock_days",
  "min_order_qty",
  "purchase_step",
  "max_order_qty",
  "is_default",
  "is_active",
  "sort_order",
  "updated_at"
)
SELECT
  concat('pv_', p."id"),
  p."id",
  CASE
    WHEN p."product_number" IS NOT NULL AND btrim(p."product_number") <> '' THEN btrim(p."product_number")
    ELSE concat('SKU-', p."id")
  END,
  p."price_gross_cents",
  p."price_net_cents",
  p."tax_rate_percent",
  p."list_price_gross_cents",
  p."list_price_net_cents",
  p."lowest_price_30d_gross_cents",
  p."lowest_price_30d_net_cents",
  p."stock_quantity",
  p."available_quantity",
  p."delivery_time_key",
  p."restock_days",
  p."min_order_qty",
  p."purchase_step",
  p."max_order_qty",
  true,
  p."is_active",
  0,
  CURRENT_TIMESTAMP
FROM "products" p;

CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_product_id_is_default_idx" ON "product_variants"("product_id", "is_default");
CREATE INDEX "product_variants_product_id_is_active_sort_order_idx" ON "product_variants"("product_id", "is_active", "sort_order");

CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
CREATE INDEX "collections_is_active_sort_order_idx" ON "collections"("is_active", "sort_order");
CREATE INDEX "collection_products_product_id_idx" ON "collection_products"("product_id");

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collection_products"
  ADD CONSTRAINT "collection_products_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collection_products"
  ADD CONSTRAINT "collection_products_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- cart_lines
ALTER TABLE "cart_lines" ADD COLUMN "product_variant_id" TEXT;

UPDATE "cart_lines" cl
SET "product_variant_id" = pv."id"
FROM "product_variants" pv
WHERE pv."product_id" = cl."product_id" AND pv."is_default" = true;

ALTER TABLE "cart_lines" ALTER COLUMN "product_variant_id" SET NOT NULL;

DROP INDEX IF EXISTS "cart_lines_cart_id_product_id_key";

CREATE UNIQUE INDEX "cart_lines_cart_id_product_variant_id_key" ON "cart_lines"("cart_id", "product_variant_id");

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- order_items
ALTER TABLE "order_items" ADD COLUMN "product_variant_id" TEXT;
ALTER TABLE "order_items" ADD COLUMN "sku_snapshot" TEXT;

UPDATE "order_items" oi
SET
  "product_variant_id" = pv."id",
  "sku_snapshot" = pv."sku"
FROM "product_variants" pv
WHERE pv."product_id" = oi."product_id" AND pv."is_default" = true;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- stock_reservations
ALTER TABLE "stock_reservations" ADD COLUMN "product_variant_id" TEXT;

UPDATE "stock_reservations" sr
SET "product_variant_id" = pv."id"
FROM "product_variants" pv
WHERE pv."product_id" = sr."product_id" AND pv."is_default" = true;

ALTER TABLE "stock_reservations" ALTER COLUMN "product_variant_id" SET NOT NULL;

DROP INDEX IF EXISTS "stock_reservations_order_id_product_id_key";

CREATE UNIQUE INDEX "stock_reservations_order_id_product_variant_id_key"
  ON "stock_reservations"("order_id", "product_variant_id");

ALTER TABLE "stock_reservations"
  ADD CONSTRAINT "stock_reservations_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- stock_movements
ALTER TABLE "stock_movements" ADD COLUMN "product_variant_id" TEXT;

UPDATE "stock_movements" sm
SET "product_variant_id" = pv."id"
FROM "product_variants" pv
WHERE pv."product_id" = sm."product_id" AND pv."is_default" = true;

CREATE INDEX "stock_movements_product_variant_id_created_at_idx"
  ON "stock_movements"("product_variant_id", "created_at");

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
