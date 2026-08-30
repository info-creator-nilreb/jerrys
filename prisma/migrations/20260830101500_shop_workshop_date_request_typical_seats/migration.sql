-- Shopweite typische Gruppengröße für Wunschtermin-Hinweis (Storefront UX)
ALTER TABLE "shop_workshop_settings"
ADD COLUMN "date_request_typical_min_seats" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "date_request_typical_max_seats" INTEGER NOT NULL DEFAULT 12;
