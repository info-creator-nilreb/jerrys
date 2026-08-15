-- Admin self-service: Passwort-Invalidierung + TOTP-MFA (ADR-0011)

ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "credentials_changed_at" TIMESTAMP(3);
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "mfa_secret_enc" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "mfa_enabled_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "admin_mfa_recovery_codes" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_mfa_recovery_codes_admin_user_id_idx"
  ON "admin_mfa_recovery_codes"("admin_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_mfa_recovery_codes_admin_user_id_fkey'
  ) THEN
    ALTER TABLE "admin_mfa_recovery_codes"
      ADD CONSTRAINT "admin_mfa_recovery_codes_admin_user_id_fkey"
      FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
