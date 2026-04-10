-- AlterTable
ALTER TABLE "carts" ADD COLUMN "customer_note" TEXT;

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'bestaetigt',
    "shipping_first_name" TEXT NOT NULL,
    "shipping_last_name" TEXT NOT NULL,
    "shipping_company" TEXT,
    "shipping_line1" TEXT NOT NULL,
    "shipping_line2" TEXT,
    "shipping_zip" TEXT NOT NULL,
    "shipping_city" TEXT NOT NULL,
    "shipping_country" TEXT NOT NULL DEFAULT 'DE',
    "customer_note" TEXT,
    "subtotal_gross_cents" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "tax_amount_cents" INTEGER NOT NULL,
    "total_gross_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_title_snapshot" TEXT NOT NULL,
    "unit_price_gross_cents" INTEGER NOT NULL,
    "tax_rate_percent_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_gross_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
