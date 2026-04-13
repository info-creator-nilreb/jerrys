// `dotenv` liegt als dependency (nicht nur dev), damit `postinstall` → `prisma generate` auch bei
// `NODE_ENV=production` / ohne devDependencies (z. B. Lighthouse-CI) die Config laden kann.
import { config as loadEnv } from "dotenv";
// Wie Next.js lokal: zuerst .env, dann .env.local überschreibt — damit `migrate`/`db seed` dieselbe DB nutzen wie `next dev`.
// Ohne .env.local bleibt nur .env wirksam; Shell-Exporte werden von Dateiwerten überschrieben.
loadEnv({ path: ".env", override: true });
loadEnv({ path: ".env.local", override: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Supabase Session Pooler: `migrate deploy` kann mit P1002 (Advisory Lock) hängen.
    // Optional DIRECT_DATABASE_URL = direkter Host db.*.supabase.co:5432 (gleiche DB), oder einmalig:
    // PRISMA_MIGRATE_DATABASE_URL="postgresql://…" npx prisma migrate deploy
    url:
      process.env["PRISMA_MIGRATE_DATABASE_URL"] ??
      process.env["DIRECT_DATABASE_URL"] ??
      process.env["DATABASE_URL"],
  },
});
