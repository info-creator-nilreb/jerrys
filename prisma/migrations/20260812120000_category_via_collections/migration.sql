-- Categories get products only via linked collections (Shopify-like).
-- Migrate existing product_categories into collections + category_collections.

CREATE TABLE "category_collections" (
    "category_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "category_collections_pkey" PRIMARY KEY ("category_id","collection_id")
);

CREATE INDEX "category_collections_collection_id_idx" ON "category_collections"("collection_id");

ALTER TABLE "category_collections" ADD CONSTRAINT "category_collections_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "category_collections" ADD CONSTRAINT "category_collections_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure a collection exists per category that had direct product memberships.
INSERT INTO "collections" ("id", "slug", "title", "description", "is_active", "sort_order", "created_at", "updated_at")
SELECT
  'mig_col_' || c."id",
  CASE
    WHEN EXISTS (SELECT 1 FROM "collections" x WHERE x."slug" = c."slug") THEN 'nav-' || c."slug"
    ELSE c."slug"
  END,
  c."title",
  COALESCE(c."description", 'Aus früherer Kategorie-Produktzuordnung migriert.'),
  c."is_active",
  c."sort_order",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "categories" c
WHERE EXISTS (SELECT 1 FROM "product_categories" pc WHERE pc."category_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "collections" x WHERE x."slug" = c."slug");

-- Link category → collection (prefer matching slug, else nav-{slug}).
INSERT INTO "category_collections" ("category_id", "collection_id", "sort_order")
SELECT
  c."id",
  COALESCE(
    (SELECT x."id" FROM "collections" x WHERE x."slug" = c."slug" LIMIT 1),
    (SELECT x."id" FROM "collections" x WHERE x."slug" = 'nav-' || c."slug" LIMIT 1)
  ),
  0
FROM "categories" c
WHERE EXISTS (SELECT 1 FROM "product_categories" pc WHERE pc."category_id" = c."id")
  AND COALESCE(
    (SELECT x."id" FROM "collections" x WHERE x."slug" = c."slug" LIMIT 1),
    (SELECT x."id" FROM "collections" x WHERE x."slug" = 'nav-' || c."slug" LIMIT 1)
  ) IS NOT NULL
ON CONFLICT DO NOTHING;

-- Copy former direct product memberships into the linked collection.
INSERT INTO "collection_products" ("collection_id", "product_id", "sort_order")
SELECT
  cc."collection_id",
  pc."product_id",
  CASE WHEN pc."is_primary" THEN 0 ELSE 100 END
FROM "product_categories" pc
INNER JOIN "category_collections" cc ON cc."category_id" = pc."category_id"
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS "product_categories_one_primary_per_product_idx";
DROP INDEX IF EXISTS "product_categories_product_id_is_primary_idx";
DROP INDEX IF EXISTS "product_categories_category_id_idx";

ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_product_id_fkey";
ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_category_id_fkey";

DROP TABLE "product_categories";
