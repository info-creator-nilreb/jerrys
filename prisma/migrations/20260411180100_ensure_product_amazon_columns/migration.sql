-- Idempotent: gleiche Spalten wie 20260411180000; hilft wenn die DB den Eintrag in _prisma_migrations hat, die ALTER TABLE aber nie lief (z. B. falsche DATABASE_URL).
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "amazon_rating_average" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "amazon_rating_count" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "amazon_review_url" TEXT;
