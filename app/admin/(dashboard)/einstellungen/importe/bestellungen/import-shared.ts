/** Freigegebene Typen/Konstanten für Admin-Shopify-Bestellimport (kein `"use server"`). */

export const SHOPIFY_ORDER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ShopifyOrderImportRow = {
  shopifyName: string;
  orderNumber: string;
  email: string;
  orderId?: string;
  status:
    | "ok"
    | "invalid"
    | "would_create"
    | "would_skip"
    | "would_update"
    | "created"
    | "updated"
    | "skipped"
    | "error";
  errors: string[];
  warnings: string[];
  lineCount: number;
  message?: string;
};

export type ShopifyOrderImportAdminSummary = {
  mode: "dry-run" | "apply";
  orderCount: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  dbChecked: boolean;
  orders: ShopifyOrderImportRow[];
};

export type ShopifyOrderImportActionState = {
  error?: string;
  ok?: boolean;
  summary?: ShopifyOrderImportAdminSummary;
} | null;
