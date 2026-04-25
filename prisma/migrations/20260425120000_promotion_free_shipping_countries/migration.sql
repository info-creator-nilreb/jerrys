-- Versandkostenfrei: optional nur für ausgewählte Länder (allow) oder mit Ausschluss (deny)
ALTER TABLE "promotions" ADD COLUMN "free_shipping_country_scope" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "promotions" ADD COLUMN "free_shipping_country_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
