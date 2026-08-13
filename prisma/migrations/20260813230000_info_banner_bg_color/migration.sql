-- Optional custom info-banner background; null = shop primary color.

ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "info_banner_bg_color" TEXT;
