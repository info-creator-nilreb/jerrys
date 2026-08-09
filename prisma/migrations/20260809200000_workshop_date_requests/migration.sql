-- CreateTable
CREATE TABLE "workshop_date_requests" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT NOT NULL,
    "preferred_starts_at" TIMESTAMP(3) NOT NULL,
    "seat_count" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "approved_session_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_date_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workshop_date_requests_approved_session_id_key" ON "workshop_date_requests"("approved_session_id");

-- CreateIndex
CREATE INDEX "workshop_date_requests_status_created_at_idx" ON "workshop_date_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "workshop_date_requests_contact_email_created_at_idx" ON "workshop_date_requests"("contact_email", "created_at");

-- AddForeignKey
ALTER TABLE "workshop_date_requests" ADD CONSTRAINT "workshop_date_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_date_requests" ADD CONSTRAINT "workshop_date_requests_approved_session_id_fkey" FOREIGN KEY ("approved_session_id") REFERENCES "workshop_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
