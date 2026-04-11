-- Rechnungsadresse (Bestand: aus Lieferadresse kopiert)
ALTER TABLE "orders" ADD COLUMN "billing_first_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_last_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_company" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_line1" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_line2" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_zip" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_city" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_country" TEXT;

UPDATE "orders" SET
  "billing_first_name" = "shipping_first_name",
  "billing_last_name" = "shipping_last_name",
  "billing_company" = "shipping_company",
  "billing_line1" = "shipping_line1",
  "billing_line2" = "shipping_line2",
  "billing_zip" = "shipping_zip",
  "billing_city" = "shipping_city",
  "billing_country" = "shipping_country"
WHERE "billing_first_name" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "billing_first_name" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billing_last_name" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billing_line1" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billing_zip" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billing_city" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billing_country" SET NOT NULL;

CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "email_type" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_logs_order_id_email_type_key" ON "email_logs"("order_id", "email_type");

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
