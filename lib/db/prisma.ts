import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  createPgPoolConfig,
  PG_POOL_CONFIG_VERSION,
  pgUsesRelaxedSsl,
} from "@/lib/db/pg-pool-config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
  /** Merkt sich, mit welcher SSL-Policy der Pool erzeugt wurde (Dev-Cache). */
  pgPoolSslRelaxed: boolean | undefined;
  pgPoolConfigVersion: number | undefined;
};

function prismaDelegateShopShippingReady(client: PrismaClient): boolean {
  const d = (client as unknown as { shopShippingSettings?: { findUnique?: unknown } }).shopShippingSettings;
  return d != null && typeof d.findUnique === "function";
}

/**
 * Lazy Prisma client so `next build` can run without a live database.
 * The first DB access must happen at runtime with DATABASE_URL set.
 */
export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const sslRelaxed = pgUsesRelaxedSsl();
  if (
    globalForPrisma.pgPool != null &&
    (globalForPrisma.pgPoolSslRelaxed !== sslRelaxed ||
      globalForPrisma.pgPoolConfigVersion !== PG_POOL_CONFIG_VERSION)
  ) {
    const stalePrisma: unknown = globalForPrisma.prisma;
    if (stalePrisma instanceof PrismaClient) {
      void stalePrisma.$disconnect();
    }
    globalForPrisma.prisma = undefined;
    void globalForPrisma.pgPool.end();
    globalForPrisma.pgPool = undefined;
    globalForPrisma.pgPoolSslRelaxed = undefined;
    globalForPrisma.pgPoolConfigVersion = undefined;
  }

  const raw: unknown = globalForPrisma.prisma;
  if (raw != null) {
    // Nach `prisma generate` oder HMR zeigt `globalThis` oft noch eine alte Instanz
    // (ohne neue Model-Delegates → undefined.findMany / 500er).
    if (raw instanceof PrismaClient) {
      if (prismaDelegateShopShippingReady(raw)) {
        return raw;
      }
      void raw.$disconnect();
      globalForPrisma.prisma = undefined;
    } else {
      void (raw as PrismaClient).$disconnect();
      globalForPrisma.prisma = undefined;
    }
  }

  const pool =
    globalForPrisma.pgPool ?? new pg.Pool(createPgPoolConfig(connectionString));

  if (!globalForPrisma.pgPool) {
    /** Dev (HMR) / erneute Prisma-Instanzen: Adapter hängen ggf. mehrere Listener an denselben Pool. */
    pool.setMaxListeners(0);
  }

  globalForPrisma.pgPool = pool;
  globalForPrisma.pgPoolSslRelaxed = sslRelaxed;
  globalForPrisma.pgPoolConfigVersion = PG_POOL_CONFIG_VERSION;

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  globalForPrisma.prisma = client;
  return client;
}
