-- Startseite: Amazon-Zitate-Slider und Social-/Instagram-Bilder (Admin)

CREATE TABLE "homepage_amazon_reviews" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "headline" TEXT,
    "author" TEXT,
    "source_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_amazon_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "homepage_amazon_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE "homepage_social_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "href" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_social_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "homepage_amazon_reviews_sort_order_idx" ON "homepage_amazon_reviews"("sort_order");

CREATE INDEX "homepage_social_images_sort_order_idx" ON "homepage_social_images"("sort_order");
