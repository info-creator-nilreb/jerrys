import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";

/** Prüft, ob Workshop-Tabellen deployt sind (ohne Schreibzugriff). */
export async function isWorkshopSchemaAvailable(): Promise<boolean> {
  try {
    await getPrisma().workshopSession.findFirst({ select: { id: true } });
    return true;
  } catch (e) {
    if (isMissingSchemaError(e)) return false;
    throw e;
  }
}

export const WORKSHOP_SCHEMA_MISSING_ADMIN_MESSAGE =
  "Das Termin-Modul ist in der Datenbank noch nicht eingerichtet, die Vercel für diese Umgebung nutzt (Supabase). Migrationen nur gegen localhost (127.0.0.1) ändern die Preview/Production-DB nicht.";

export const WORKSHOP_SCHEMA_MISSING_ADMIN_HINT =
  "Lokal die Supabase-Direkt-URL in .env.local als DATABASE_URL setzen (nicht den Transaction-Pooler), dann npm run db:migrate:status und npm run db:migrate:deploy. Details: docs/OPERATIONS.md#migrationen-ausführen.";
