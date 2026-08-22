-- PDP-Vertrauenselemente (Rückgaberecht + Trust-Banner) konfigurierbar in ShopSettings
ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "pdp_return_policy_text" TEXT;

ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "pdp_trust_bar_items" JSONB NOT NULL DEFAULT '[{"enabled":true,"icon":"truck","title":"Kostenloser Versand","subtitle":null,"appendFreeShippingThreshold":true},{"enabled":true,"icon":"leaf","title":"Klimaneutral verpackt","subtitle":null,"appendFreeShippingThreshold":false},{"enabled":true,"icon":"headphones","title":"Persönlicher Support","subtitle":null,"appendFreeShippingThreshold":false}]';

UPDATE "shop_settings"
SET "pdp_return_policy_text" = COALESCE("pdp_return_policy_text", '30 Tage Rückgaberecht')
WHERE "pdp_return_policy_text" IS NULL;
