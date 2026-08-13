-- Desktop header: inline nav beside logo vs under logo.

ALTER TABLE "shop_settings"
  ADD COLUMN "header_nav_placement" TEXT NOT NULL DEFAULT 'beside';
