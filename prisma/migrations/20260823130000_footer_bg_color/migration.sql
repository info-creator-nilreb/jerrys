-- Footer-Hintergrundfarbe (Storefront); Default = bisheriges Navy #182d4d
ALTER TABLE "shop_settings"
  ADD COLUMN IF NOT EXISTS "footer_bg_color" TEXT NOT NULL DEFAULT '#182d4d';
