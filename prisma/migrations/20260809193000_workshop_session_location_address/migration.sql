-- Workshop-Termin: konkrete Adresse für Storefront/Navigation
ALTER TABLE "workshop_sessions" ADD COLUMN "location_line1" TEXT;
ALTER TABLE "workshop_sessions" ADD COLUMN "location_line2" TEXT;
ALTER TABLE "workshop_sessions" ADD COLUMN "location_zip" TEXT;
ALTER TABLE "workshop_sessions" ADD COLUMN "location_city" TEXT;
ALTER TABLE "workshop_sessions" ADD COLUMN "location_country" TEXT DEFAULT 'DE';
