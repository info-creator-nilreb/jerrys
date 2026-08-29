import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("shop-settings-schema");

let ensurePromise: Promise<void> | null = null;

/**
 * Stellt sicher, dass neuere ShopSettings-Spalten existieren (Preview/Prod ohne
 * frisches `migrate deploy`). Idempotent — PostgreSQL `IF NOT EXISTS`.
 */
export async function ensureShopSettingsColumns(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const prisma = getPrisma();
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "header_nav_placement" TEXT NOT NULL DEFAULT 'beside'
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "info_banner_active" BOOLEAN NOT NULL DEFAULT false
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "info_banner_messages" JSONB NOT NULL DEFAULT '[]'
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "info_banner_duration_sec" INTEGER NOT NULL DEFAULT 6
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "info_banner_href" TEXT
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "info_banner_bg_color" TEXT
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "pdp_return_policy_text" TEXT
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "pdp_trust_bar_items" JSONB NOT NULL DEFAULT '[{"enabled":true,"icon":"truck","title":"Kostenloser Versand","subtitle":null,"appendFreeShippingThreshold":true},{"enabled":true,"icon":"leaf","title":"Klimaneutral verpackt","subtitle":null,"appendFreeShippingThreshold":false},{"enabled":true,"icon":"headphones","title":"Persönlicher Support","subtitle":null,"appendFreeShippingThreshold":false}]'
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "footer_bg_color" TEXT NOT NULL DEFAULT '#182d4d'
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "pickup_store_label" TEXT
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "pickup_ready_text" TEXT
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "shop_settings"
            ADD COLUMN IF NOT EXISTS "pickup_info_url" TEXT
        `);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "products"
            ADD COLUMN IF NOT EXISTS "pickup_available" BOOLEAN NOT NULL DEFAULT false
        `);
      } catch (e) {
        // DDL schlägt z. B. am Supabase-Pooler fehl — kein harter Abbruch;
        // `findUnique` liefert P2022, `getShopSettings` fällt auf Defaults zurück.
        log.warn("ensure_shop_settings_columns_failed", errorMeta(e));
      }
    })();
  }
  await ensurePromise;
}
