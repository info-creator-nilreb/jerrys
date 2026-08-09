-- Serie: Entwürfe einer Bulk-Anlage gemeinsam veröffentlichen
ALTER TABLE "workshop_sessions" ADD COLUMN "series_batch_id" TEXT;

CREATE INDEX "workshop_sessions_series_batch_id_status_idx"
  ON "workshop_sessions" ("series_batch_id", "status")
  WHERE "series_batch_id" IS NOT NULL;
