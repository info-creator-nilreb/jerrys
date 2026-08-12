-- Editierbare Transaktions-Mail-Templates (Shopify-ähnlich).
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "text_body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");
