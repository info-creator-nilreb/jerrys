-- Lieferart: Versand (Standard) oder Abholung vor Ort.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "delivery_method" TEXT NOT NULL DEFAULT 'shipping';
