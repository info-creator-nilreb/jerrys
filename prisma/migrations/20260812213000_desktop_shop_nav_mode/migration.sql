-- Desktop header shop nav presentation (hidden | inline | burger).

ALTER TABLE "shop_settings"
  ADD COLUMN "desktop_shop_nav_mode" TEXT NOT NULL DEFAULT 'inline';
