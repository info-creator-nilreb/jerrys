-- Product slug redirects (301) after relaunch / slug changes
ALTER TABLE "products" ADD COLUMN "previous_slug" TEXT;

CREATE INDEX "products_previous_slug_idx" ON "products"("previous_slug");
