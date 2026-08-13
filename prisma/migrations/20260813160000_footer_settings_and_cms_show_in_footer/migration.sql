-- Footer composition toggles on ShopSettings + opt-in CMS footer links.

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_tagline" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_shop_nav" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_collections" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_cms_links" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_social" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_legal_agb" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_legal_widerruf" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_legal_rueckgabe" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "shop_settings"
  ADD COLUMN "footer_show_legal_versand" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "content_pages"
  ADD COLUMN "show_in_footer" BOOLEAN NOT NULL DEFAULT false;

-- Bestehende Hero-Blöcke ohne CTA: Conversion-Default setzen (nur wenn beides leer).
UPDATE "content_blocks"
SET "data" = jsonb_set(
  jsonb_set(COALESCE("data"::jsonb, '{}'::jsonb), '{ctaLabel}', '"Produkte entdecken"'),
  '{ctaHref}',
  '"/produkte"'
)
WHERE "type" = 'hero'
  AND COALESCE("data"->>'ctaLabel', '') = ''
  AND COALESCE("data"->>'ctaHref', '') = '';
