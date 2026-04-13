-- Versandländer pro Produkt (ISO-3166-1-alpha-2); Standard nur DE für bestehende Zeilen
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shipping_country_codes" TEXT[] NOT NULL DEFAULT ARRAY['DE']::TEXT[];
