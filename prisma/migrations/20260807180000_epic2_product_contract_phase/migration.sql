-- Epic 2 contract phase: commerce fields live only on product_variants

ALTER TABLE "products" DROP COLUMN IF EXISTS "price_gross_cents";
ALTER TABLE "products" DROP COLUMN IF EXISTS "price_net_cents";
ALTER TABLE "products" DROP COLUMN IF EXISTS "tax_rate_percent";
ALTER TABLE "products" DROP COLUMN IF EXISTS "list_price_gross_cents";
ALTER TABLE "products" DROP COLUMN IF EXISTS "list_price_net_cents";
ALTER TABLE "products" DROP COLUMN IF EXISTS "lowest_price_30d_gross_cents";
ALTER TABLE "products" DROP COLUMN IF EXISTS "lowest_price_30d_net_cents";
ALTER TABLE "products" DROP COLUMN IF EXISTS "stock_quantity";
ALTER TABLE "products" DROP COLUMN IF EXISTS "available_quantity";
ALTER TABLE "products" DROP COLUMN IF EXISTS "delivery_time_key";
ALTER TABLE "products" DROP COLUMN IF EXISTS "restock_days";
ALTER TABLE "products" DROP COLUMN IF EXISTS "min_order_qty";
ALTER TABLE "products" DROP COLUMN IF EXISTS "purchase_step";
ALTER TABLE "products" DROP COLUMN IF EXISTS "max_order_qty";
