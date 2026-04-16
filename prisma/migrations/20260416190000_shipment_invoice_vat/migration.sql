-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('DHL', 'DPD', 'UPS', 'Hermes');

-- CreateTable
CREATE TABLE "invoice_counter" (
    "id" INTEGER NOT NULL,
    "next_seq" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "invoice_counter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "invoice_counter" ("id", "next_seq") VALUES (1, 1);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "vat_applies" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "shipping_carrier" "ShippingCarrier",
ADD COLUMN "tracking_number" TEXT,
ADD COLUMN "invoice_number" TEXT,
ADD COLUMN "invoice_issued_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoice_number_key" ON "orders"("invoice_number");
