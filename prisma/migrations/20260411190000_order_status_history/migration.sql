-- Status-Historie für Bestellungen (Epic 4: State Machine / Audit)
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bestehende Bestellungen: ein Initial-Eintrag (Checkout-Status)
INSERT INTO "order_status_history" ("id", "order_id", "from_status", "to_status", "created_at")
SELECT gen_random_uuid()::text, "id", NULL, "status", "created_at" FROM "orders";
