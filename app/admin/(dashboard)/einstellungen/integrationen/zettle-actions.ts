"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createZettleClientFromConnection,
  disconnectZettleConnection,
  deleteZettleProductMapping,
  exchangeZettleApiKeyForToken,
  parseZettleApiKeyClaims,
  retryFailedZettlePurchaseSyncs,
  saveZettleApiKeyConnection,
  syncZettlePurchases,
  upsertZettleProductMapping,
  type ZettleCatalogProduct,
} from "@/features/inventory";
import { getAdminSession } from "@/lib/auth/admin-session";
import { z } from "zod";

export type ZettleAdminActionState =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
      products?: Array<{
        uuid: string;
        name: string;
        variants: Array<{ uuid: string; name: string | null; sku: string | null }>;
      }>;
    }
  | null;

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session?.user) redirect("/admin/login");
}

const apiKeySchema = z.object({
  apiKey: z.string().trim().min(20, "API-Key fehlt oder ist zu kurz."),
});

/**
 * Speichert Zettle-API-Key, tauscht Assertion gegen Access-Token und prüft users/self.
 */
export async function saveZettleApiKeyAction(
  _prev: ZettleAdminActionState,
  formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();

  const parsed = apiKeySchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  let claims;
  try {
    claims = parseZettleApiKeyClaims(parsed.data.apiKey);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "API-Key ungültig." };
  }

  let token;
  try {
    token = await exchangeZettleApiKeyForToken({
      clientId: claims.clientId,
      apiKey: parsed.data.apiKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token-Austausch fehlgeschlagen.";
    const detail =
      e && typeof e === "object" && "responseBody" in e
        ? String((e as { responseBody?: string }).responseBody ?? "").slice(0, 160)
        : "";
    return { error: detail ? `${msg} Antwort: ${detail}` : msg };
  }

  const expiresAt = new Date(Date.now() + token.expiresIn * 1000);

  // Temporär speichern, dann users/self
  try {
    await saveZettleApiKeyConnection({
      clientId: claims.clientId,
      apiKey: parsed.data.apiKey,
      organizationUuid: null,
      accessToken: token.accessToken,
      accessTokenExpiresAt: expiresAt,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }

  try {
    const client = await createZettleClientFromConnection();
    if (!client) {
      return { error: "Verbindung konnte nicht geladen werden." };
    }
    const user = await client.getUserSelf();
    await saveZettleApiKeyConnection({
      clientId: claims.clientId,
      apiKey: parsed.data.apiKey,
      organizationUuid: user.organizationUuid,
      accessToken: token.accessToken,
      accessTokenExpiresAt: expiresAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "users/self fehlgeschlagen.";
    return { error: msg };
  }

  revalidatePath("/admin/einstellungen/integrationen");
  return {
    ok: true,
    message: "Zettle verbunden und Organisation geprüft. Als Nächstes Varianten mappen.",
  };
}

export async function disconnectZettleAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  const ok = await disconnectZettleConnection();
  revalidatePath("/admin/einstellungen/integrationen");
  return ok
    ? { ok: true, message: "Zettle-Verbindung und Mappings entfernt." }
    : { error: "Keine Verbindung vorhanden." };
}

export async function loadZettleProductsAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  try {
    const client = await createZettleClientFromConnection();
    if (!client) return { error: "Zuerst Zettle verbinden." };
    const products: ZettleCatalogProduct[] = await client.listProducts();
    return {
      ok: true,
      message: `${products.length} Zettle-Produkte geladen.`,
      products: products.map((p) => ({
        uuid: p.uuid,
        name: p.name,
        variants: p.variants,
      })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Produkte laden fehlgeschlagen.";
    return { error: msg };
  }
}

const mappingSchema = z.object({
  productVariantId: z.string().trim().min(1),
  zettleProductUuid: z.string().trim().min(8, "Ungültige Zettle-Produkt-ID."),
  zettleVariantUuid: z.string().trim().min(8, "Ungültige Zettle-Varianten-ID."),
  zettleProductName: z.string().trim().max(200).optional(),
  zettleVariantName: z.string().trim().max(200).optional(),
});

export async function saveZettleMappingAction(
  _prev: ZettleAdminActionState,
  formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();

  const productVariantId = String(formData.get("productVariantId") ?? "").trim();
  const selection = String(formData.get("zettleSelection") ?? "").trim();
  // Format: productUuid::variantUuid::productName::variantName
  const parts = selection.split("::");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return { error: "Bitte eine Zettle-Variante auswählen." };
  }

  const parsed = mappingSchema.safeParse({
    productVariantId,
    zettleProductUuid: parts[0],
    zettleVariantUuid: parts[1],
    zettleProductName: parts[2] || undefined,
    zettleVariantName: parts[3] || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Mapping-Daten." };
  }

  try {
    await upsertZettleProductMapping(parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Mapping speichern fehlgeschlagen." };
  }

  revalidatePath("/admin/einstellungen/integrationen");
  return { ok: true, message: "Mapping gespeichert." };
}

export async function deleteZettleMappingAction(
  _prev: ZettleAdminActionState,
  formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  const productVariantId = String(formData.get("productVariantId") ?? "").trim();
  if (!productVariantId) return { error: "Variante fehlt." };
  const ok = await deleteZettleProductMapping(productVariantId);
  revalidatePath("/admin/einstellungen/integrationen");
  return ok
    ? { ok: true, message: "Mapping entfernt." }
    : { error: "Kein Mapping vorhanden." };
}

export async function syncZettlePurchasesAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  try {
    const result = await syncZettlePurchases({ lookbackDays: 7, limit: 50 });
    revalidatePath("/admin/einstellungen/integrationen");
    return {
      ok: true,
      message: `Sync: ${result.fetched} geladen · ${result.processed} verbucht · ${result.skipped} übersprungen · ${result.failed} Fehler.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sync fehlgeschlagen." };
  }
}

export async function retryZettlePurchaseSyncAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  try {
    const result = await retryFailedZettlePurchaseSyncs();
    revalidatePath("/admin/einstellungen/integrationen");
    return {
      ok: true,
      message: `Retry: ${result.processed} verbucht · ${result.failed} weiterhin fehlerhaft.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Retry fehlgeschlagen." };
  }
}
