/** Wie prisma.config.ts / Next.js: `.env`, dann `.env.local` (override). */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env", override: true });
loadEnv({ path: ".env.local", override: true });
