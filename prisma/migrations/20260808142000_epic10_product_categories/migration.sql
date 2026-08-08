-- Epic 10 Slice 1: Product categories (browse taxonomy)

CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_categories" (
    "product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

CREATE INDEX "product_categories_category_id_idx" ON "product_categories"("category_id");

CREATE INDEX "product_categories_product_id_is_primary_idx" ON "product_categories"("product_id", "is_primary");

CREATE UNIQUE INDEX "product_categories_one_primary_per_product_idx"
  ON "product_categories"("product_id")
  WHERE "is_primary" = true;

ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
