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
  "Das Termin-Modul ist in der Datenbank noch nicht eingerichtet. Auf dem Server (Supabase) die ausstehenden Migrationen ausführen: npm run db:migrate:deploy — siehe docs/OPERATIONS.md.";
