"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rebuildProductSearchIndex } from "@/features/catalog/server";
import { getAdminSession } from "@/lib/auth/admin-session";

export type SearchIndexAdminActionState =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
    }
  | null;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

/**
 * Startet einen vollständigen Rebuild des öffentlichen Produktsuchindex.
 * Keine Storefront-UI — nur Index-Fundament (Epic 14 Slice 2).
 */
export async function rebuildSearchIndexAction(
  _prev: SearchIndexAdminActionState,
  formData: FormData,
): Promise<SearchIndexAdminActionState> {
  await requireAdmin();

  const forceReembed =
    formData.get("forceReembed") === "on" || formData.get("forceReembed") === "true";

  try {
    const result = await rebuildProductSearchIndex({ forceReembed });
    revalidatePath("/admin/einstellungen/integrationen");

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        message: `Rebuild mit Hinweisen: ${result.stats.indexed} indexiert, ${result.stats.skippedUnchanged} unverändert, ${result.stats.excluded} ausgeschlossen, ${result.stats.errors} Fehler.`,
      };
    }

    return {
      ok: true,
      message: `Rebuild abgeschlossen: ${result.stats.indexed} indexiert, ${result.stats.skippedUnchanged} unverändert, ${result.stats.excluded} ausgeschlossen, ${result.stats.errors} Fehler.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Rebuild fehlgeschlagen.",
    };
  }
}
