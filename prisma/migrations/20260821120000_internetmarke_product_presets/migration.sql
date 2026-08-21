-- Vorgewählte INTERNETMARKE-Produkte (1–5) für die Auswahl beim Label-Kauf.
ALTER TABLE "internetmarke_connections"
ADD COLUMN IF NOT EXISTS "product_presets" JSONB NOT NULL DEFAULT '[]';

UPDATE "internetmarke_connections"
SET "product_presets" = jsonb_build_array(
  jsonb_build_object(
    'productCode', "product_code",
    'name', COALESCE(NULLIF(BTRIM("product_name_snapshot"), ''), 'Produkt ' || "product_code"::text),
    'priceCents', "product_price_cents",
    'transport', 'unknown'
  )
)
WHERE "product_code" IS NOT NULL
  AND "product_code" > 0
  AND "product_price_cents" IS NOT NULL
  AND "product_price_cents" > 0
  AND ("product_presets" = '[]'::jsonb);
