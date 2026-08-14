/** Freigegebene Typen/Konstanten für Admin-Shopify-Import (kein `"use server"`). */

/** Shopify-CSV-Uploads: bewusst unter typischen Server-Action-Limits. */
export const SHOPIFY_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export type ShopifyImportProductRow = {
  handle: string;
  slug: string;
  productId?: string;
  isActive?: boolean;
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
  variantCount: number;
  imageCount: number;
  message?: string;
};

export type ShopifyImportAdminSummary = {
  mode: "dry-run" | "apply";
  productCount: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  dbChecked: boolean;
  products: ShopifyImportProductRow[];
};

export type ShopifyImportActionState = {
  error?: string;
  ok?: boolean;
  summary?: ShopifyImportAdminSummary;
} | null;
