"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { importShopifyOrdersFromCsv } from "@/features/orders/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  SHOPIFY_ORDER_IMPORT_MAX_BYTES,
  type ShopifyOrderImportActionState,
  type ShopifyOrderImportAdminSummary,
} from "@/app/admin/(dashboard)/orders/shopify-import/import-shared";

const log = createLogger("admin.shopify-order-import");

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

function parseUpdateExisting(formData: FormData): boolean {
  const v = formData.get("updateExisting");
  return v === "on" || v === "true" || v === "1";
}

async function readCsvFromFormData(
  formData: FormData,
): Promise<{ text: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte eine Shopify-Bestell-CSV auswählen." };
  }
  const name = file.name.toLowerCase();
  if (
    !name.endsWith(".csv") &&
    file.type !== "text/csv" &&
    file.type !== "application/vnd.ms-excel"
  ) {
    return { error: "Nur CSV-Dateien werden unterstützt." };
  }
  if (file.size > SHOPIFY_ORDER_IMPORT_MAX_BYTES) {
    return {
      error: `Datei zu groß (max. ${Math.round(SHOPIFY_ORDER_IMPORT_MAX_BYTES / (1024 * 1024))} MB).`,
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
  report: Awaited<ReturnType<typeof importShopifyOrdersFromCsv>>,
): ShopifyOrderImportAdminSummary {
  return {
    mode: report.mode,
    orderCount: report.orderCount,
    validCount: report.validCount,
    invalidCount: report.invalidCount,
    createdCount: report.createdCount,
    updatedCount: report.updatedCount,
    skippedCount: report.skippedCount,
    dbChecked: report.dbChecked,
    orders: report.orders,
  };
}

export async function previewShopifyOrderCsvImport(
  _prev: ShopifyOrderImportActionState,
  formData: FormData,
): Promise<ShopifyOrderImportActionState> {
  await requireAdminSession();

  const csv = await readCsvFromFormData(formData);
  if ("error" in csv) return { error: csv.error };

  const taxRatePercent = parseTaxRate(formData);
  if (taxRatePercent == null) return { error: "Steuersatz muss 7 oder 19 sein." };

  const updateExisting = parseUpdateExisting(formData);

  try {
    const report = await importShopifyOrdersFromCsv(csv.text, {
      mode: "dry-run",
      updateExisting,
      defaultTaxRatePercent: taxRatePercent,
      checkExistingInDb: true,
    });
    return { ok: true, summary: toSummary(report) };
  } catch (e) {
    log.error("preview_failed", errorMeta(e));
    return { error: "Vorschau fehlgeschlagen. CSV-Format prüfen." };
  }
}

export async function applyShopifyOrderCsvImport(
  _prev: ShopifyOrderImportActionState,
  formData: FormData,
): Promise<ShopifyOrderImportActionState> {
  await requireAdminSession();

  const confirm = formData.get("confirmApply");
  if (confirm !== "on" && confirm !== "true" && confirm !== "1") {
    return { error: "Bitte den Import ausdrücklich bestätigen." };
  }

  const csv = await readCsvFromFormData(formData);
  if ("error" in csv) return { error: csv.error };

  const taxRatePercent = parseTaxRate(formData);
  if (taxRatePercent == null) return { error: "Steuersatz muss 7 oder 19 sein." };

  const updateExisting = parseUpdateExisting(formData);

  try {
    const preview = await importShopifyOrdersFromCsv(csv.text, {
      mode: "dry-run",
      updateExisting,
      defaultTaxRatePercent: taxRatePercent,
      checkExistingInDb: true,
    });
    if (preview.invalidCount > 0) {
      return {
        error: `${preview.invalidCount} Bestellung(en) ungültig — Import abgebrochen.`,
        summary: toSummary(preview),
      };
    }
    if (preview.validCount === 0) {
      return { error: "Keine gültigen Bestellungen in der CSV.", summary: toSummary(preview) };
    }

    const report = await importShopifyOrdersFromCsv(csv.text, {
      mode: "apply",
      updateExisting,
      defaultTaxRatePercent: taxRatePercent,
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");

    return { ok: true, summary: toSummary(report) };
  } catch (e) {
    log.error("apply_failed", errorMeta(e));
    return { error: "Import fehlgeschlagen. Details in den Server-Logs." };
  }
}
