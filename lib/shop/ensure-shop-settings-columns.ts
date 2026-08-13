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
      } catch (e) {
        log.warn("ensure_shop_settings_columns_failed", errorMeta(e));
        ensurePromise = null;
        throw e;
      }
    })();
  }
  await ensurePromise;
}
