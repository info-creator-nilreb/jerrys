-- Auth mode for Instagram connection (instagram login vs facebook login).
ALTER TABLE "instagram_connections"
ADD COLUMN IF NOT EXISTS "auth_mode" TEXT NOT NULL DEFAULT 'instagram';
