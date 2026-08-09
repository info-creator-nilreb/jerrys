-- Epic 3 Slice 3: customer address book
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "company" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_customer_id_kind_idx" ON "customer_addresses"("customer_id", "kind");
CREATE INDEX "customer_addresses_customer_id_kind_is_default_idx" ON "customer_addresses"("customer_id", "kind", "is_default");

ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
