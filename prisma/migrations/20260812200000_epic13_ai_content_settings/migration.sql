-- Epic 13 Slice 2: KI-Content-Admin-Konfiguration (verschlüsselter Key, Modelle, Tageslimit)
CREATE TABLE "ai_content_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "api_key_enc" TEXT,
    "text_model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "vision_model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "image_model" TEXT NOT NULL DEFAULT 'dall-e-3',
    "moderation_model" TEXT NOT NULL DEFAULT 'omni-moderation-latest',
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "daily_request_limit" INTEGER NOT NULL DEFAULT 100,
    "requests_used_today" INTEGER NOT NULL DEFAULT 0,
    "requests_day_key" TEXT NOT NULL DEFAULT '',
    "connected_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_content_settings_pkey" PRIMARY KEY ("id")
);
