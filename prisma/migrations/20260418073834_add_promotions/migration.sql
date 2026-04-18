-- AlterTable
ALTER TABLE "invoice_counter" ALTER COLUMN "id" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_off_subtotal_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotion_code_snapshot" TEXT,
ADD COLUMN     "promotion_id" TEXT,
ADD COLUMN     "promotion_title_snapshot" TEXT;

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "promotion_type" TEXT NOT NULL DEFAULT 'order_discount',
    "application_mode" TEXT NOT NULL,
    "code" TEXT,
    "discount_value_type" TEXT NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "minimum_requirement_type" TEXT NOT NULL,
    "minimum_cart_value_cents" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "published_once" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_application_mode_is_enabled_start_date_end_date_idx" ON "promotions"("application_mode", "is_enabled", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
