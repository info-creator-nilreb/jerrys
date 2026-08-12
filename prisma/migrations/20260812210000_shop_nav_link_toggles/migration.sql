-- Header/Footer shop nav: optional system links (Shopify-like menu composition).

ALTER TABLE "shop_settings"
  ADD COLUMN "show_all_products_in_nav" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "show_termine_in_nav" BOOLEAN NOT NULL DEFAULT true;
