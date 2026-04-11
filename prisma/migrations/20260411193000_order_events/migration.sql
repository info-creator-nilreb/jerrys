-- Audit-/Ereignisstrom pro Bestellung (Admin, erweiterbar)
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_events_order_id_created_at_idx" ON "order_events"("order_id", "created_at");

ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bestehende Bestellungen: ein Ereignis „eingegangen“ (ohne Checkout-Kontext)
INSERT INTO "order_events" ("id", "order_id", "event_type", "metadata", "created_at")
SELECT
  gen_random_uuid()::text,
  "id",
  'order.placed',
  jsonb_build_object('orderNumber', "order_number", 'backfill', true),
  "created_at"
FROM "orders";
