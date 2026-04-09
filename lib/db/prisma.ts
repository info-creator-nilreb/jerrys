import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

/**
 * Lazy Prisma client so `next build` can run without a live database.
 * The first DB access must happen at runtime with DATABASE_URL set.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  globalForPrisma.prisma = client;
  return client;
}
