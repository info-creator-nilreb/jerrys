-- Site-wide info banner above the storefront header.

ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "info_banner_active" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "info_banner_messages" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "info_banner_duration_sec" INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS "info_banner_href" TEXT;
