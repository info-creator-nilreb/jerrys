-- Produkt: Abholung vor Ort erlaubt
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "pickup_available" BOOLEAN NOT NULL DEFAULT false;

-- Shop: Texte für Abhol-Hinweis auf der PDP
ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "pickup_store_label" TEXT;

ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "pickup_ready_text" TEXT;

ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "pickup_info_url" TEXT;
