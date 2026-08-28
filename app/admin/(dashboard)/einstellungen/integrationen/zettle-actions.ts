"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adoptZettleDiscrepancyStock,
  autoMapUnmappedZettleVariants,
  buildZettleDiscrepancyReport,
  createZettleClientFromConnection,
  disconnectZettleConnection,
  deleteZettleProductMapping,
  ensureZettlePurchaseWebhook,
  exchangeZettleApiKeyForToken,
  formatZettleAutoMapActionMessage,
  parseZettleApiKeyClaims,
  removeZettlePurchaseWebhook,
  retryFailedZettlePurchaseSyncs,
  saveZettleApiKeyConnection,
  syncZettlePurchases,
  upsertZettleProductMapping,
  type ZettleDiscrepancyRow,
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
        variants: Array<{
          uuid: string;
          name: string | null;
          sku: string | null;
          barcode: string | null;
        }>;
      }>;
      ambiguousHints?: Array<{
        productVariantId: string;
        candidateValues: string[];
      }>;
      discrepancy?: {
        compared: number;
        mismatches: number;
        untracked: number;
        rows: ZettleDiscrepancyRow[];
      };
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

  const webhook = await ensureZettlePurchaseWebhook();
  const autoMap = await autoMapUnmappedZettleVariants().catch(() => null);
  revalidatePath("/admin/einstellungen/integrationen");

  const connectMsg = webhook.ok
    ? "Zettle verbunden."
    : `Zettle verbunden. Webhook: ${webhook.message}`;
  if (!autoMap || !autoMap.ok) {
    return {
      ok: true,
      message: `${connectMsg} Als Nächstes Katalog abgleichen — eindeutige Varianten werden automatisch zugeordnet.`,
    };
  }

  return {
    ok: true,
    message: `${connectMsg} ${formatZettleAutoMapActionMessage(autoMap)}`,
    products: autoMap.products.map(toProductPayload),
    ambiguousHints: toAmbiguousHints(autoMap.ambiguousHints),
  };
}

export async function disconnectZettleAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  try {
    await removeZettlePurchaseWebhook();
  } catch {
    /* ignore */
  }
  const ok = await disconnectZettleConnection();
  revalidatePath("/admin/einstellungen/integrationen");
  return ok
    ? { ok: true, message: "Zettle-Verbindung, Webhook und Mappings entfernt." }
    : { error: "Keine Verbindung vorhanden." };
}

export async function loadZettleProductsAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  try {
    const result = await autoMapUnmappedZettleVariants();
    if (!result.ok) return { error: result.error };
    revalidatePath("/admin/einstellungen/integrationen");
    return {
      ok: true,
      message: formatZettleAutoMapActionMessage(result),
      products: result.products.map(toProductPayload),
      ambiguousHints: toAmbiguousHints(result.ambiguousHints),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Katalog abgleichen fehlgeschlagen.";
    return { error: msg };
  }
}

function toProductPayload(product: {
  uuid: string;
  name: string;
  variants: Array<{ uuid: string; name: string | null; sku: string | null; barcode: string | null }>;
}) {
  return {
    uuid: product.uuid,
    name: product.name,
    variants: product.variants,
  };
}

function zettleSelectionValue(
  productUuid: string,
  variantUuid: string,
  productName: string,
  variantName: string | null,
): string {
  return `${productUuid}::${variantUuid}::${productName.replaceAll("::", " ")}::${(variantName ?? "").replaceAll("::", " ")}`;
}

function toAmbiguousHints(
  hints: Array<{
    productVariantId: string;
    candidates: Array<{
      productUuid: string;
      variantUuid: string;
      productName: string;
      variantName: string | null;
    }>;
  }>,
) {
  return hints.map((hint) => ({
    productVariantId: hint.productVariantId,
    candidateValues: hint.candidates.map((c) =>
      zettleSelectionValue(c.productUuid, c.variantUuid, c.productName, c.variantName),
    ),
  }));
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

export async function ensureZettleWebhookAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  const result = await ensureZettlePurchaseWebhook();
  revalidatePath("/admin/einstellungen/integrationen");
  return result.ok
    ? { ok: true, message: result.message }
    : { error: result.message };
}

export async function runZettleDiscrepancyAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  const report = await buildZettleDiscrepancyReport();
  if (!report.ok) {
    return { error: report.error ?? "Discrepancy-Report fehlgeschlagen." };
  }
  return {
    ok: true,
    message: `Verglichen: ${report.compared} · Abweichungen: ${report.mismatches} · ohne Zettle-Tracking: ${report.untracked}`,
    discrepancy: {
      compared: report.compared,
      mismatches: report.mismatches,
      untracked: report.untracked,
      rows: report.rows.slice(0, 40),
    },
  };
}

function discrepancyPayloadFromReport(
  report: Awaited<ReturnType<typeof buildZettleDiscrepancyReport>>,
) {
  return {
    compared: report.compared,
    mismatches: report.mismatches,
    untracked: report.untracked,
    rows: report.rows.slice(0, 40),
  };
}

export async function adoptZettleStockAction(
  _prev: ZettleAdminActionState,
  formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  const productVariantId = String(formData.get("productVariantId") ?? "").trim();
  if (!productVariantId) return { error: "Variante fehlt." };

  const result = await adoptZettleDiscrepancyStock({ productVariantIds: [productVariantId] });
  revalidatePath("/admin/einstellungen/integrationen");

  const report = await buildZettleDiscrepancyReport();
  if (!result.ok && result.adopted === 0) {
    return {
      error: result.errors[0] ?? "Zettle-Bestand konnte nicht übernommen werden.",
      discrepancy: report.ok ? discrepancyPayloadFromReport(report) : undefined,
    };
  }

  const reportMsg = report.ok
    ? ` · Verglichen: ${report.compared} · Abweichungen: ${report.mismatches}`
    : "";
  return {
    ok: true,
    message: `Zettle-Bestand übernommen: ${result.adopted} Variante(n)${result.errors.length ? ` · ${result.errors.length} Hinweis(e)` : ""}${reportMsg}`,
    discrepancy: report.ok ? discrepancyPayloadFromReport(report) : undefined,
  };
}

export async function adoptAllZettleStockAction(
  _prev: ZettleAdminActionState,
  _formData: FormData,
): Promise<ZettleAdminActionState> {
  await requireAdmin();
  const result = await adoptZettleDiscrepancyStock({ adoptAllMismatches: true });
  revalidatePath("/admin/einstellungen/integrationen");

  const report = await buildZettleDiscrepancyReport();
  if (!result.ok && result.adopted === 0) {
    return {
      error: result.errors[0] ?? "Keine Abweichungen übernommen.",
      discrepancy: report.ok ? discrepancyPayloadFromReport(report) : undefined,
    };
  }

  const reportMsg = report.ok
    ? ` · Verglichen: ${report.compared} · Abweichungen: ${report.mismatches}`
    : "";
  return {
    ok: true,
    message: `Zettle-Bestände übernommen: ${result.adopted} Variante(n), ${result.skipped} übersprungen${reportMsg}`,
    discrepancy: report.ok ? discrepancyPayloadFromReport(report) : undefined,
  };
}
