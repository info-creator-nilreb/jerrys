/** Freigegebene Typen/Konstanten für Admin-Shopify-Bestellimport (kein `"use server"`). */

/** Abgestimmt auf `next.config.ts` → experimental.serverActions.bodySizeLimit. */
export const SHOPIFY_ORDER_IMPORT_MAX_BYTES = 15 * 1024 * 1024;

/** Admin-Vorschau/Import: große Exporte über CLI (kein Server-Action-Timeout). */
export const SHOPIFY_ORDER_IMPORT_ADMIN_MAX_ORDERS = 500;

/** Max. Zeilen in der Admin-Tabelle (Rest nur als Summe). */
export const SHOPIFY_ORDER_IMPORT_ADMIN_PREVIEW_ROWS = 100;

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
  /** Zeigt nur einen Ausschnitt — siehe `ordersTruncated`. */
  ordersShown?: number;
  ordersTruncated?: boolean;
};

export type ShopifyOrderImportActionState = {
  error?: string;
  ok?: boolean;
  summary?: ShopifyOrderImportAdminSummary;
} | null;

/** Kürzt die Ergebnisliste für Server-Action-Responses und Admin-Tabelle. */
export function trimOrdersForAdminPreview<T extends ShopifyOrderImportRow>(
  orders: T[],
  maxRows = SHOPIFY_ORDER_IMPORT_ADMIN_PREVIEW_ROWS,
): { orders: T[]; ordersShown: number; ordersTruncated: boolean } {
  if (orders.length <= maxRows) {
    return { orders, ordersShown: orders.length, ordersTruncated: false };
  }

  const priority = orders.filter((o) => o.status === "invalid" || o.status === "error");
  const rest = orders.filter((o) => o.status !== "invalid" && o.status !== "error");
  const shown = [...priority];
  const room = Math.max(0, maxRows - shown.length);
  if (room > 0) shown.push(...rest.slice(0, room));

  return { orders: shown, ordersShown: shown.length, ordersTruncated: true };
}

export function adminOrderImportLimitMessage(orderCount: number): string {
  return (
    `Die CSV enthält ${orderCount.toLocaleString("de-DE")} Bestellungen — im Admin sind maximal ` +
    `${SHOPIFY_ORDER_IMPORT_ADMIN_MAX_ORDERS.toLocaleString("de-DE")} erlaubt. ` +
    `Für große Exporte die CLI nutzen:\n\n` +
    `npm run orders:import-shopify -- --file ./orders_export_1.csv --out ./tmp/orders-dry-run.json\n` +
    `npm run orders:import-shopify -- --file ./orders_export_1.csv --apply`
  );
}
