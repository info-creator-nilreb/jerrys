-- Epic 3 Slice 1: Customer identity and auth tokens

CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "first_name" TEXT,
    "last_name" TEXT,
    "password_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_identities" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_auth_tokens" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

CREATE INDEX "customers_is_active_created_at_idx" ON "customers"("is_active", "created_at");

CREATE UNIQUE INDEX "customer_identities_provider_provider_subject_key" ON "customer_identities"("provider", "provider_subject");

CREATE INDEX "customer_identities_customer_id_idx" ON "customer_identities"("customer_id");

CREATE UNIQUE INDEX "customer_auth_tokens_token_hash_key" ON "customer_auth_tokens"("token_hash");

CREATE INDEX "customer_auth_tokens_customer_id_purpose_idx" ON "customer_auth_tokens"("customer_id", "purpose");

CREATE INDEX "customer_auth_tokens_expires_at_idx" ON "customer_auth_tokens"("expires_at");

ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_auth_tokens" ADD CONSTRAINT "customer_auth_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
