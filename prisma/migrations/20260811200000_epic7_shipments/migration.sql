-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('draft', 'labeled', 'shipped', 'delivered', 'voided', 'returned');

-- CreateEnum
CREATE TYPE "ShippingLabelProvider" AS ENUM ('none', 'internetmarke', 'dhl_parcel');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'draft',
    "carrier" "ShippingCarrier",
    "tracking_number" TEXT,
    "label_provider" "ShippingLabelProvider" NOT NULL DEFAULT 'none',
    "label_external_ref" TEXT,
    "label_storage_key" TEXT,
    "label_purchased_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipments_order_id_status_idx" ON "shipments"("order_id", "status");

-- CreateIndex
CREATE INDEX "shipments_label_external_ref_idx" ON "shipments"("label_external_ref");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
