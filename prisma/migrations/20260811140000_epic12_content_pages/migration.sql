-- Epic 12 Slice 1: ContentPage / ContentBlock (ADR-0007)

CREATE TYPE "ContentPageType" AS ENUM ('homepage', 'content', 'legal');
CREATE TYPE "ContentPageStatus" AS ENUM ('draft', 'published');

CREATE TABLE "content_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "page_type" "ContentPageType" NOT NULL,
    "status" "ContentPageStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "og_image_url" TEXT,
    "canonical_path" TEXT,
    "robots_index" BOOLEAN NOT NULL DEFAULT true,
    "previous_slug" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_pages_slug_key" ON "content_pages"("slug");
CREATE INDEX "content_pages_status_page_type_idx" ON "content_pages"("status", "page_type");

CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_blocks_page_id_sort_order_idx" ON "content_blocks"("page_id", "sort_order");

ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "content_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
