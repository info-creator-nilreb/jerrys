-- INTERNETMARKE credentials + selected product (Epic 7), singleton like Instagram.
CREATE TABLE IF NOT EXISTS "internetmarke_connections" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_enc" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_enc" TEXT NOT NULL,
    "product_code" INTEGER,
    "product_price_cents" INTEGER,
    "product_name_snapshot" TEXT,
    "page_format_id" INTEGER NOT NULL DEFAULT 1,
    "voucher_layout" TEXT NOT NULL DEFAULT 'ADDRESS_ZONE',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3),
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internetmarke_connections_pkey" PRIMARY KEY ("id")
);
