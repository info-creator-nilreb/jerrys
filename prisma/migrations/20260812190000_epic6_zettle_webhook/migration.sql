-- Epic 6 Slice 3: Zettle Pusher webhook subscription fields

ALTER TABLE "zettle_connections" ADD COLUMN "webhook_subscription_uuid" TEXT;
ALTER TABLE "zettle_connections" ADD COLUMN "webhook_signing_key_enc" TEXT;
ALTER TABLE "zettle_connections" ADD COLUMN "webhook_destination" TEXT;
