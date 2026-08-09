-- Epic 5 foundation + Epic 3 Slice 5 customer portal (workshop sessions & bookings)

CREATE TABLE "shop_workshop_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "self_cancel_hours_before_start" INTEGER NOT NULL DEFAULT 48,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_workshop_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "shop_workshop_settings" ("id", "self_cancel_hours_before_start", "updated_at")
VALUES ('default', 48, CURRENT_TIMESTAMP);

CREATE TABLE "workshop_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "location_label" TEXT NOT NULL,
    "price_cents_per_seat" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "minimum_participants" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL,
    "max_seats_per_booking" INTEGER,
    "self_cancel_hours_before_start" INTEGER,
    "confirmed_seat_count" INTEGER NOT NULL DEFAULT 0,
    "held_seat_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_sessions_status_starts_at_idx" ON "workshop_sessions"("status", "starts_at");

CREATE TABLE "workshop_bookings" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "order_id" TEXT,
    "contact_email" TEXT NOT NULL,
    "seat_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "session_title_snapshot" TEXT NOT NULL,
    "session_starts_at_snapshot" TIMESTAMP(3) NOT NULL,
    "session_timezone_snapshot" TEXT NOT NULL,
    "session_location_snapshot" TEXT NOT NULL,
    "unit_price_cents_snapshot" INTEGER NOT NULL,
    "currency_snapshot" TEXT NOT NULL DEFAULT 'EUR',
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_bookings_customer_id_created_at_idx" ON "workshop_bookings"("customer_id", "created_at");
CREATE INDEX "workshop_bookings_session_id_status_idx" ON "workshop_bookings"("session_id", "status");

ALTER TABLE "workshop_bookings" ADD CONSTRAINT "workshop_bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workshop_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workshop_bookings" ADD CONSTRAINT "workshop_bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "workshop_booking_events" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_booking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_booking_events_booking_id_created_at_idx" ON "workshop_booking_events"("booking_id", "created_at");

ALTER TABLE "workshop_booking_events" ADD CONSTRAINT "workshop_booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "workshop_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
