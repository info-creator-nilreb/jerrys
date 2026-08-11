-- Epic 12: CMS media library for upload + picker (Vercel Blob URLs).
CREATE TABLE IF NOT EXISTS "content_media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_media_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "content_media_assets_created_at_idx" ON "content_media_assets"("created_at");
