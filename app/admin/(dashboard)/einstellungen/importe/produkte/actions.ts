"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { importShopifyProductsFromCsv } from "@/features/catalog/server";
import { DELIVERY_TIME_OPTIONS, type DeliveryTimeKey } from "@/lib/catalog/delivery-options";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  SHOPIFY_IMPORT_MAX_BYTES,
  type ShopifyImportActionState,
  type ShopifyImportAdminSummary,
} from "@/app/admin/(dashboard)/einstellungen/importe/produkte/import-shared";

const log = createLogger("admin.shopify-import");

async function requireAdminSession(): Promise<void> {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }
}

function parseTaxRate(formData: FormData): 7 | 19 | null {
  const raw = String(formData.get("taxRatePercent") ?? "19").trim();
  const n = Number(raw);
  if (n === 7 || n === 19) return n;
  return null;
}

function parseDeliveryKey(formData: FormData): DeliveryTimeKey | null {
  const raw = String(formData.get("deliveryTimeKey") ?? "2-4-werktage").trim();
  if (DELIVERY_TIME_OPTIONS.some((o) => o.value === raw)) {
    return raw as DeliveryTimeKey;
  }
  return null;
}

function parseUpdateExisting(formData: FormData): boolean {
  const v = formData.get("updateExisting");
  return v === "on" || v === "true" || v === "1";
}

function parseFlag(formData: FormData, name: string): boolean {
  const v = formData.get(name);
  return v === "on" || v === "true" || v === "1";
}

function parseIncludeHandles(formData: FormData): string[] | null {
  const raw = formData.get("includeHandles");
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((h): h is string => typeof h === "string" && h.trim().length > 0);
  } catch {
    return null;
  }
}

function importOptionsFromForm(formData: FormData, mode: "dry-run" | "apply") {
  const taxRatePercent = parseTaxRate(formData);
  const deliveryTimeKey = parseDeliveryKey(formData);
  if (taxRatePercent == null || deliveryTimeKey == null) return { error: true as const };

  const includeHandles = parseIncludeHandles(formData);
  return {
    error: false as const,
    options: {
      mode,
      updateExisting: parseUpdateExisting(formData),
      taxRatePercent,
      deliveryTimeKey,
      checkExistingInDb: mode === "dry-run",
      allowIncompleteAsDraft: parseFlag(formData, "allowIncompleteAsDraft"),
      mirrorImages: parseFlag(formData, "mirrorImages"),
      skipInvalid: parseFlag(formData, "skipInvalid"),
      includeHandles: includeHandles ?? undefined,
    },
  };
}

async function readCsvFromFormData(
  formData: FormData,
): Promise<{ text: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Shopify-Produkt-CSV auswählen." };
  }
  const name = file.name.toLowerCase();
  if (
    !name.endsWith(".csv") &&
    file.type !== "text/csv" &&
    file.type !== "application/vnd.ms-excel"
  ) {
    return { error: "Nur CSV-Dateien werden unterstützt." };
  }
  if (file.size > SHOPIFY_IMPORT_MAX_BYTES) {
    return {
      error: `Datei zu groß (max. ${Math.round(SHOPIFY_IMPORT_MAX_BYTES / (1024 * 1024))} MB).`,
    };
  }
  try {
    const text = await file.text();
    if (!text.trim()) {
      return { error: "Die CSV-Datei ist leer." };
    }
    return { text };
  } catch (e) {
    log.error("csv_read_failed", errorMeta(e));
    return { error: "CSV konnte nicht gelesen werden." };
  }
}

function toSummary(
  report: Awaited<ReturnType<typeof importShopifyProductsFromCsv>>,
): ShopifyImportAdminSummary {
  return {
    mode: report.mode,
    productCount: report.productCount,
    validCount: report.validCount,
    invalidCount: report.invalidCount,
    createdCount: report.createdCount,
    updatedCount: report.updatedCount,
    skippedCount: report.skippedCount,
    dbChecked: report.dbChecked,
    products: report.products,
  };
}

export async function previewShopifyCsvImport(
  _prev: ShopifyImportActionState,
  formData: FormData,
): Promise<ShopifyImportActionState> {
  await requireAdminSession();

  const csv = await readCsvFromFormData(formData);
  if ("error" in csv) return { error: csv.error };

  const parsed = importOptionsFromForm(formData, "dry-run");
  if (parsed.error) {
    if (parseTaxRate(formData) == null) return { error: "Steuersatz muss 7 oder 19 sein." };
    return { error: "Ungültige Lieferzeit." };
  }

  try {
    const report = await importShopifyProductsFromCsv(csv.text, parsed.options);
    return { ok: true, summary: toSummary(report) };
  } catch (e) {
    log.error("preview_failed", errorMeta(e));
    return { error: "Vorschau fehlgeschlagen. CSV-Format prüfen." };
  }
}

export async function applyShopifyCsvImport(
  _prev: ShopifyImportActionState,
  formData: FormData,
): Promise<ShopifyImportActionState> {
  await requireAdminSession();

  const confirm = formData.get("confirmApply");
  if (confirm !== "on" && confirm !== "true" && confirm !== "1") {
    return { error: "Bitte den Import ausdrücklich bestätigen." };
  }

  const csv = await readCsvFromFormData(formData);
  if ("error" in csv) return { error: csv.error };

  const parsed = importOptionsFromForm(formData, "apply");
  if (parsed.error) {
    if (parseTaxRate(formData) == null) return { error: "Steuersatz muss 7 oder 19 sein." };
    return { error: "Ungültige Lieferzeit." };
  }

  const includeHandles = parsed.options.includeHandles;
  if (!includeHandles?.length) {
    return { error: "Keine Produkte ausgewählt — mindestens eines in der Vorschau markieren." };
  }

  try {
    const preview = await importShopifyProductsFromCsv(csv.text, {
      ...parsed.options,
      mode: "dry-run",
      checkExistingInDb: true,
    });

    const selectedInvalid = preview.products.filter(
      (p) => includeHandles.includes(p.handle) && p.status === "invalid",
    );
    if (selectedInvalid.length > 0) {
      return {
        error: `${selectedInvalid.length} ausgewählte(s) Produkt(e) ungültig — abwählen oder in Shopify korrigieren.`,
        summary: toSummary(preview),
      };
    }

    if (!parsed.options.skipInvalid && preview.invalidCount > 0) {
      return {
        error: `${preview.invalidCount} Produkt(e) ungültig — „Ungültige überspringen“ aktivieren oder Handle korrigieren.`,
        summary: toSummary(preview),
      };
    }

    const importableSelected = preview.products.filter(
      (p) =>
        includeHandles.includes(p.handle) &&
        p.status !== "invalid" &&
        p.status !== "would_skip",
    );
    if (importableSelected.length === 0) {
      return {
        error: "Keine importierbaren Produkte in der Auswahl.",
        summary: toSummary(preview),
      };
    }

    const report = await importShopifyProductsFromCsv(csv.text, parsed.options);

    revalidatePath("/admin/products");
    revalidatePath("/admin/bestand");
    revalidatePath("/produkte");

    return { ok: true, summary: toSummary(report) };
  } catch (e) {
    log.error("apply_failed", errorMeta(e));
    return { error: "Import fehlgeschlagen. Details in den Server-Logs." };
  }
}
