CREATE TABLE "workshop_session_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_session_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_session_events_session_id_created_at_idx" ON "workshop_session_events"("session_id", "created_at");

ALTER TABLE "workshop_session_events" ADD CONSTRAINT "workshop_session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workshop_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
