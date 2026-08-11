-- Instagram OAuth connection + media cache for CMS/social feed.
CREATE TABLE IF NOT EXISTS "instagram_connections" (
    "id" TEXT NOT NULL,
    "ig_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "access_token_enc" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "instagram_media_cache" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "caption" TEXT,
    "permalink" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "posted_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "instagram_media_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "instagram_media_cache_media_id_key" ON "instagram_media_cache"("media_id");
CREATE INDEX IF NOT EXISTS "instagram_media_cache_is_active_sort_order_idx" ON "instagram_media_cache"("is_active", "sort_order");
