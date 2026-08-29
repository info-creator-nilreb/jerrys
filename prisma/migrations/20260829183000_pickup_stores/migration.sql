-- Abholorte (shopweit)
CREATE TABLE "pickup_stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "info_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_stores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pickup_stores_is_active_sort_order_idx" ON "pickup_stores"("is_active", "sort_order");

-- Produkt: Abholort + Fertigstellungsdauer
ALTER TABLE "products" ADD COLUMN "pickup_store_id" TEXT;
ALTER TABLE "products" ADD COLUMN "pickup_ready_hours" INTEGER;

CREATE INDEX "products_pickup_store_id_idx" ON "products"("pickup_store_id");

ALTER TABLE "products" ADD CONSTRAINT "products_pickup_store_id_fkey"
  FOREIGN KEY ("pickup_store_id") REFERENCES "pickup_stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bestehenden Shop-Standort als ersten Abholort übernehmen
INSERT INTO "pickup_stores" (
  "id", "name", "line1", "line2", "zip", "city", "country", "info_url", "is_active", "sort_order", "created_at", "updated_at"
)
SELECT
  'pickup-default',
  COALESCE(NULLIF(TRIM("pickup_store_label"), ''), CONCAT('Store ', COALESCE(NULLIF(TRIM("address_city"), ''), 'Berlin'))),
  COALESCE(NULLIF(TRIM("address_line1"), ''), 'Adresse in Versand → Abholorte ergänzen'),
  NULLIF(TRIM("address_line2"), ''),
  COALESCE(NULLIF(TRIM("address_zip"), ''), '10115'),
  COALESCE(NULLIF(TRIM("address_city"), ''), 'Berlin'),
  COALESCE(NULLIF(TRIM("address_country"), ''), 'DE'),
  NULLIF(TRIM("pickup_info_url"), ''),
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "shop_settings"
WHERE "id" = 'default'
ON CONFLICT ("id") DO NOTHING;

UPDATE "products"
SET
  "pickup_store_id" = 'pickup-default',
  "pickup_ready_hours" = 24
WHERE "pickup_available" = true;
