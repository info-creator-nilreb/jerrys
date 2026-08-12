-- Epic 13 Slice 6: Audit-Events für KI-Generierungen (Usage/Kosten/Fehler)
CREATE TABLE "ai_content_generation_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capability" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT,
    "request_id" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "estimated_cost_micros" INTEGER,
    "admin_user_id" TEXT,
    "product_id" TEXT,
    "content_page_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ai_content_generation_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_content_generation_events_created_at_idx" ON "ai_content_generation_events"("created_at");
CREATE INDEX "ai_content_generation_events_status_created_at_idx" ON "ai_content_generation_events"("status", "created_at");
