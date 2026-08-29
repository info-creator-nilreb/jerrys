-- Admin-Login: shop-spezifisches Hero-Bild (Blob-URL oder Pfad unter public/)
ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "admin_login_hero_url" TEXT;
