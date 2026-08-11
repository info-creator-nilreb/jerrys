/**
 * Idempotente CMS-Migration: Startseite + Rechtstexte.
 * Usage: npx tsx scripts/migrate-storefront-content.ts
 */
import { migrateStorefrontContentPages } from "../lib/content/migrate-storefront-content";

async function main() {
  const result = await migrateStorefrontContentPages();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
