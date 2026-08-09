-- Epic 5 Slice 3: seat holds during checkout

ALTER TABLE "workshop_bookings" ADD COLUMN "hold_expires_at" TIMESTAMP(3);

CREATE INDEX "workshop_bookings_status_hold_expires_at_idx" ON "workshop_bookings"("status", "hold_expires_at");
