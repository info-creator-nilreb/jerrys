-- Epic 3 Slice 6: mark anonymized customer accounts (right to erasure with statutory retention)
ALTER TABLE "customers" ADD COLUMN "anonymized_at" TIMESTAMP(3);
