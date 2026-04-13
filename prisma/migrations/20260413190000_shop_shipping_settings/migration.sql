-- Globale Versandeinstellungen; Versandländer/Kosten nicht mehr pro Produkt.

CREATE TABLE "shop_shipping_settings" (
    "id" TEXT NOT NULL,
    "shipping_country_codes" TEXT[] NOT NULL DEFAULT ARRAY['DE']::TEXT[],
    "shipping_rates_cents_by_country" JSONB NOT NULL DEFAULT '{}',
    "free_shipping_from_subtotal_gross_cents" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_shipping_settings_pkey" PRIMARY KEY ("id")
);

WITH dist AS (
    SELECT DISTINCT UPPER(TRIM(x)) AS c
    FROM "products"
    CROSS JOIN LATERAL unnest("shipping_country_codes") AS x
    WHERE char_length(trim(x)) = 2
)
INSERT INTO "shop_shipping_settings" (
    "id",
    "shipping_country_codes",
    "shipping_rates_cents_by_country",
    "free_shipping_from_subtotal_gross_cents",
    "updated_at"
)
SELECT
    'default',
    COALESCE((SELECT array_agg(c ORDER BY c) FROM dist), ARRAY['DE']::TEXT[]),
    '{}'::jsonb,
    NULL,
    CURRENT_TIMESTAMP;

ALTER TABLE "products" DROP COLUMN IF EXISTS "free_shipping";
ALTER TABLE "products" DROP COLUMN IF EXISTS "shipping_country_codes";
