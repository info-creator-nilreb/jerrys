-- Optionale Amazon-Bewertungsanzeige (manuell gepflegt / Seed, kein Scraping)
ALTER TABLE "products" ADD COLUMN "amazon_rating_average" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "amazon_rating_count" INTEGER;
ALTER TABLE "products" ADD COLUMN "amazon_review_url" TEXT;
