-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

INSERT INTO "manufacturers" ("id", "name", "sort_order")
VALUES ('seed_mfr_jerrys', 'jerry''s', 0);

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN "is_cover" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "manufacturer_id" TEXT,
ADD COLUMN "product_number" TEXT,
ADD COLUMN "price_gross_cents" INTEGER,
ADD COLUMN "price_net_cents" INTEGER,
ADD COLUMN "tax_rate_percent" INTEGER NOT NULL DEFAULT 19,
ADD COLUMN "list_price_gross_cents" INTEGER,
ADD COLUMN "list_price_net_cents" INTEGER,
ADD COLUMN "lowest_price_30d_gross_cents" INTEGER,
ADD COLUMN "lowest_price_30d_net_cents" INTEGER,
ADD COLUMN "stock_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "delivery_time_key" TEXT,
ADD COLUMN "restock_days" INTEGER,
ADD COLUMN "free_shipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "min_order_qty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "purchase_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "max_order_qty" INTEGER;

UPDATE "products"
SET
    "price_gross_cents" = "price_cents",
    "price_net_cents" = ROUND(("price_cents"::numeric / 1.19))::integer;

ALTER TABLE "products" ALTER COLUMN "price_gross_cents" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "price_net_cents" SET NOT NULL;

ALTER TABLE "products" DROP COLUMN "price_cents";

UPDATE "products" SET "manufacturer_id" = 'seed_mfr_jerrys';

WITH "first_img" AS (
    SELECT DISTINCT ON ("product_id") "id"
    FROM "product_images"
    ORDER BY "product_id" ASC, "sort_order" ASC, "created_at" ASC
)
UPDATE "product_images" AS "pi"
SET "is_cover" = true
FROM "first_img" AS "f"
WHERE "pi"."id" = "f"."id";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
