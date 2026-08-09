-- Epic 3 Slice 2: optional Order → Customer link (guest orders remain null)

ALTER TABLE "orders" ADD COLUMN "customer_id" TEXT;

CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
