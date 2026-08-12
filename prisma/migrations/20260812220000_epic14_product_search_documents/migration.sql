-- Epic 14 Slice 2: öffentliches Produktsuchdokument + Embedding-Felder (providerneutral)
CREATE TYPE "SearchDocumentStatus" AS ENUM ('pending', 'indexed', 'stale', 'error', 'excluded');

CREATE TABLE "product_search_documents" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "document_text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "status" "SearchDocumentStatus" NOT NULL DEFAULT 'pending',
    "last_error" TEXT,
    "embedding_provider" TEXT,
    "embedding_model" TEXT,
    "embedding_dims" INTEGER,
    "embedding" JSONB,
    "embedding_updated_at" TIMESTAMP(3),
    "last_indexed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_search_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_search_documents_product_id_key" ON "product_search_documents"("product_id");
CREATE INDEX "product_search_documents_status_updated_at_idx" ON "product_search_documents"("status", "updated_at");
CREATE INDEX "product_search_documents_content_hash_idx" ON "product_search_documents"("content_hash");

ALTER TABLE "product_search_documents" ADD CONSTRAINT "product_search_documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "search_index_state" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "last_rebuild_started_at" TIMESTAMP(3),
    "last_rebuild_finished_at" TIMESTAMP(3),
    "last_rebuild_error" TEXT,
    "last_rebuild_stats" JSONB,
    "documents_total" INTEGER NOT NULL DEFAULT 0,
    "documents_indexed" INTEGER NOT NULL DEFAULT 0,
    "documents_pending" INTEGER NOT NULL DEFAULT 0,
    "documents_error" INTEGER NOT NULL DEFAULT 0,
    "documents_excluded" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_index_state_pkey" PRIMARY KEY ("id")
);
