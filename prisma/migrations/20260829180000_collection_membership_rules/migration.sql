-- Automatische Kollektionsregeln (z. B. „Neu“ = Produkte der letzten X Tage)
ALTER TABLE "collections"
ADD COLUMN "membership_mode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "rule_days" INTEGER;
