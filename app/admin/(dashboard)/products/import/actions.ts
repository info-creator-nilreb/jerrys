"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import {
  importShopifyProductsFromCsv,
  type ShopifyImportProductResult,
} from "@/features/catalog";
import { DELIVERY_TIME_OPTIONS, type DeliveryTimeKey } from "@/lib/catalog/delivery-options";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("admin.shopify-import");

/** Shopify-CSV-Uploads: bewusst unter typischen Server-Action-Limits. */
export const SHOPIFY_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ShopifyImportAdminSummary = {
  mode: "dry-run" | "apply";
  productCount: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  dbChecked: boolean;
  products: ShopifyImportProductResult[];
};

export type ShopifyImportActionState = {
  error?: string;
  ok?: boolean;
  summary?: ShopifyImportAdminSummary;
} | null;

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

async function readCsvFromFormData(
  formData: FormData,
): Promise<{ text: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Shopify-Produkt-CSV auswählen." };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && file.type !== "text/csv" && file.type !== "application/vnd.ms-excel") {
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

  const taxRatePercent = parseTaxRate(formData);
  if (taxRatePercent == null) return { error: "Steuersatz muss 7 oder 19 sein." };

  const deliveryTimeKey = parseDeliveryKey(formData);
  if (deliveryTimeKey == null) return { error: "Ungültige Lieferzeit." };

  const updateExisting = parseUpdateExisting(formData);

  try {
    const report = await importShopifyProductsFromCsv(csv.text, {
      mode: "dry-run",
      updateExisting,
      taxRatePercent,
      deliveryTimeKey,
      checkExistingInDb: true,
    });
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

  const taxRatePercent = parseTaxRate(formData);
  if (taxRatePercent == null) return { error: "Steuersatz muss 7 oder 19 sein." };

  const deliveryTimeKey = parseDeliveryKey(formData);
  if (deliveryTimeKey == null) return { error: "Ungültige Lieferzeit." };

  const updateExisting = parseUpdateExisting(formData);

  try {
    // Erst Dry-Run: bei Validierungsfehlern nichts schreiben
    const preview = await importShopifyProductsFromCsv(csv.text, {
      mode: "dry-run",
      updateExisting,
      taxRatePercent,
      deliveryTimeKey,
      checkExistingInDb: true,
    });
    if (preview.invalidCount > 0) {
      return {
        error: `${preview.invalidCount} Produkt(e) ungültig — Import abgebrochen.`,
        summary: toSummary(preview),
      };
    }
    if (preview.validCount === 0) {
      return { error: "Keine gültigen Produkte in der CSV.", summary: toSummary(preview) };
    }

    const report = await importShopifyProductsFromCsv(csv.text, {
      mode: "apply",
      updateExisting,
      taxRatePercent,
      deliveryTimeKey,
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/bestand");
    revalidatePath("/produkte");

    return { ok: true, summary: toSummary(report) };
  } catch (e) {
    log.error("apply_failed", errorMeta(e));
    return { error: "Import fehlgeschlagen. Details in den Server-Logs." };
  }
}
