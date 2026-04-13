-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category_tag" TEXT,
ADD COLUMN     "dimensions_text" TEXT,
ADD COLUMN     "feature_bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_bestseller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lead_text" TEXT,
ADD COLUMN     "material_text" TEXT,
ADD COLUMN     "weight_text" TEXT;
