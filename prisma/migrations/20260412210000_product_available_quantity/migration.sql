-- Verfügbarer Bestand (Shop) vs. Lagerbestand (phys., Abbuchung bei „versandt“ / shipped)
ALTER TABLE "products" ADD COLUMN "available_quantity" INTEGER NOT NULL DEFAULT 0;
UPDATE "products" SET "available_quantity" = "stock_quantity";
