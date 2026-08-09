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

type DelegateBag = {
  findUnique?: unknown;
  findMany?: unknown;
};

function prismaDelegateReady(client: object, name: string, method: keyof DelegateBag): boolean {
  const d = (client as Record<string, DelegateBag | undefined>)[name];
  return d != null && typeof d[method] === "function";
}

/**
 * Nach `prisma generate` / HMR kann `globalThis.prisma` eine alte Instanz sein
 * (einzelne Model-Delegates fehlen → `undefined.findMany` / React #441 in Prod).
 * Mindestens Shipping + Workshop-Modelle müssen vorhanden sein.
 *
 * Wichtig: Duck-Typing statt `instanceof` — bei HMR gibt es oft zwei PrismaClient-Klassen;
 * `instanceof` schlägt fehl und ein `$disconnect()` killt laufende Transactions (P2028).
 */
function prismaClientDelegatesReady(client: object): boolean {
  return (
    prismaDelegateReady(client, "shopShippingSettings", "findUnique") &&
    prismaDelegateReady(client, "workshopSession", "findMany") &&
    prismaDelegateReady(client, "workshopBooking", "findMany")
  );
}

function discardCachedPrisma(reason: string): void {
  const prev = globalForPrisma.prisma;
  globalForPrisma.prisma = undefined;
  if (prev != null && typeof (prev as PrismaClient).$disconnect === "function") {
    void (prev as PrismaClient).$disconnect().catch(() => {
      /* ignore — Client ggf. schon tot */
    });
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(`[prisma] discarding cached client (${reason})`);
  }
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
    discardCachedPrisma("pool-config-changed");
    void globalForPrisma.pgPool.end();
    globalForPrisma.pgPool = undefined;
    globalForPrisma.pgPoolSslRelaxed = undefined;
    globalForPrisma.pgPoolConfigVersion = undefined;
  }

  const raw = globalForPrisma.prisma;
  if (raw != null) {
    // Duck-Typing: gesunden Cache behalten (auch wenn `instanceof` nach HMR fehlschlägt).
    if (prismaClientDelegatesReady(raw)) {
      return raw;
    }
    discardCachedPrisma("stale-delegates");
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

  if (!prismaClientDelegatesReady(client)) {
    void client.$disconnect();
    globalForPrisma.prisma = undefined;
    throw new Error(
      "Prisma client missing workshop delegates — run `npx prisma generate` and restart the server.",
    );
  }

  globalForPrisma.prisma = client;
  return client;
}
