import { csvRowsToObjects, detectCsvDelimiter, parseCsvAuto, stripUtf8Bom } from "@/features/catalog";

export type ShopifyParsedOrderLine = {
  quantity: number;
  name: string;
  unitPriceGrossCents: number;
  sku: string;
};

export type ShopifyParsedOrder = {
  /** Shopify „Name“ (#1042) oder Fallback Id. */
  shopifyName: string;
  shopifyId: string;
  email: string;
  phone: string;
  financialStatus: string;
  fulfillmentStatus: string;
  cancelledAt: string;
  createdAt: Date | null;
  currency: string;
  subtotalGrossCents: number;
  shippingCents: number;
  taxAmountCents: number;
  totalGrossCents: number;
  discountOffSubtotalCents: number;
  paymentMethodRaw: string;
  billingName: string;
  billingCompany: string;
  billingLine1: string;
  billingLine2: string;
  billingZip: string;
  billingCity: string;
  billingCountry: string;
  shippingName: string;
  shippingCompany: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
  customerNote: string;
  shippingMethod: string;
  lineItems: ShopifyParsedOrderLine[];
};

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (key in row && row[key] != null) return String(row[key]).trim();
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(row)) {
      if (k.trim().toLowerCase() === lower) return String(v).trim();
    }
  }
  return "";
}

export type ShopifyOrderCsvDiagnostics = {
  delimiter: "," | ";" | "\t";
  dataRowCount: number;
  headers: string[];
  hasNameColumn: boolean;
  hasIdColumn: boolean;
  hasLineitemColumn: boolean;
  hint: string;
};

/** Hilft bei leerer Vorschau (falsches Format, Trennzeichen, Spalten). */
export function diagnoseShopifyOrderCsv(csvText: string): ShopifyOrderCsvDiagnostics {
  const normalized = stripUtf8Bom(csvText);
  const firstLine = normalized.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectCsvDelimiter(firstLine);
  const rows = parseCsvAuto(normalized);
  const objects = csvRowsToObjects(rows);
  const headers = rows[0]?.map((h) => h.trim().replace(/^\uFEFF/, "")).filter(Boolean) ?? [];

  const headerLower = new Set(headers.map((h) => h.toLowerCase()));
  const hasNameColumn = headerLower.has("name");
  const hasIdColumn = headerLower.has("id");
  const hasLineitemColumn =
    headerLower.has("lineitem name") ||
    headerLower.has("lineitem quantity") ||
    headerLower.has("lineitem price");

  let hint = "";
  if (objects.length === 0) {
    hint = "Die CSV enthält keine Datenzeilen (nur Kopfzeile oder leer).";
  } else if (!hasNameColumn && !hasIdColumn) {
    hint = `Keine Spalten „Name“ oder „Id“ gefunden (Trennzeichen: „${delimiter}“). Kopfzeile prüfen — Shopify-Orders-Export aus dem Admin verwenden.`;
  } else if (delimiter === ";") {
    hint = "Semikolon-Trennung erkannt — Parser angepasst. Wenn weiterhin 0 Bestellungen: Export erneut als „CSV für Excel“ aus Shopify laden.";
  } else if (!hasLineitemColumn) {
    hint = "Keine Lineitem-Spalten gefunden — evtl. falscher Export-Typ (kein Bestell-CSV).";
  } else {
    hint = "Format wirkt plausibel — prüfe, ob „Name“/„Id“ in Datenzeilen befüllt sind.";
  }

  return {
    delimiter,
    dataRowCount: objects.length,
    headers: headers.slice(0, 12),
    hasNameColumn,
    hasIdColumn,
    hasLineitemColumn,
    hint,
  };
}

/** Shopify-Währungsstring → Cent (z. B. „65,35“ oder „65.35“). */
export function parseShopifyMoneyToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function parseShopifyDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseQuantity(raw: string): number {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mergeOrderHeader(
  target: ShopifyParsedOrder,
  row: Record<string, string>,
): void {
  const email = cell(row, "Email");
  if (email) target.email = email;

  const phone = cell(row, "Phone", "Billing Phone", "Shipping Phone");
  if (phone) target.phone = phone;

  const financial = cell(row, "Financial Status");
  if (financial) target.financialStatus = financial;

  const fulfillment = cell(row, "Fulfillment Status");
  if (fulfillment) target.fulfillmentStatus = fulfillment;

  const cancelled = cell(row, "Cancelled at");
  if (cancelled) target.cancelledAt = cancelled;

  const created = cell(row, "Created at");
  if (created) {
    const parsed = parseShopifyDate(created);
    if (parsed) target.createdAt = parsed;
  }

  const currency = cell(row, "Currency");
  if (currency) target.currency = currency.toUpperCase();

  const subtotal = cell(row, "Subtotal");
  if (subtotal) target.subtotalGrossCents = parseShopifyMoneyToCents(subtotal);

  const shipping = cell(row, "Shipping");
  if (shipping) target.shippingCents = parseShopifyMoneyToCents(shipping);

  const taxes = cell(row, "Taxes");
  if (taxes) target.taxAmountCents = parseShopifyMoneyToCents(taxes);

  const total = cell(row, "Total");
  if (total) target.totalGrossCents = parseShopifyMoneyToCents(total);

  const discount = cell(row, "Discount Amount");
  if (discount) target.discountOffSubtotalCents = parseShopifyMoneyToCents(discount);

  const payment = cell(row, "Payment Method");
  if (payment) target.paymentMethodRaw = payment;

  const billingName = cell(row, "Billing Name");
  if (billingName) target.billingName = billingName;

  const billingCompany = cell(row, "Billing Company");
  if (billingCompany) target.billingCompany = billingCompany;

  const billingLine1 = cell(row, "Billing Address1", "Billing Street");
  if (billingLine1) target.billingLine1 = billingLine1;

  const billingLine2 = cell(row, "Billing Address2");
  if (billingLine2) target.billingLine2 = billingLine2;

  const billingZip = cell(row, "Billing Zip");
  if (billingZip) target.billingZip = billingZip;

  const billingCity = cell(row, "Billing City");
  if (billingCity) target.billingCity = billingCity;

  const billingCountry = cell(row, "Billing Country");
  if (billingCountry) target.billingCountry = billingCountry;

  const shippingName = cell(row, "Shipping Name");
  if (shippingName) target.shippingName = shippingName;

  const shippingCompany = cell(row, "Shipping Company");
  if (shippingCompany) target.shippingCompany = shippingCompany;

  const shippingLine1 = cell(row, "Shipping Address1", "Shipping Street");
  if (shippingLine1) target.shippingLine1 = shippingLine1;

  const shippingLine2 = cell(row, "Shipping Address2");
  if (shippingLine2) target.shippingLine2 = shippingLine2;

  const shippingZip = cell(row, "Shipping Zip");
  if (shippingZip) target.shippingZip = shippingZip;

  const shippingCity = cell(row, "Shipping City");
  if (shippingCity) target.shippingCity = shippingCity;

  const shippingCountry = cell(row, "Shipping Country");
  if (shippingCountry) target.shippingCountry = shippingCountry;

  const note = cell(row, "Notes", "Note");
  if (note) target.customerNote = note;

  const shippingMethod = cell(row, "Shipping Method");
  if (shippingMethod) target.shippingMethod = shippingMethod;
}

function newOrderFromRow(row: Record<string, string>): ShopifyParsedOrder {
  const shopifyName = cell(row, "Name");
  const shopifyId = cell(row, "Id");
  return {
    shopifyName,
    shopifyId,
    email: "",
    phone: "",
    financialStatus: "",
    fulfillmentStatus: "",
    cancelledAt: "",
    createdAt: null,
    currency: "EUR",
    subtotalGrossCents: 0,
    shippingCents: 0,
    taxAmountCents: 0,
    totalGrossCents: 0,
    discountOffSubtotalCents: 0,
    paymentMethodRaw: "",
    billingName: "",
    billingCompany: "",
    billingLine1: "",
    billingLine2: "",
    billingZip: "",
    billingCity: "",
    billingCountry: "DE",
    shippingName: "",
    shippingCompany: "",
    shippingLine1: "",
    shippingLine2: "",
    shippingZip: "",
    shippingCity: "",
    shippingCountry: "DE",
    customerNote: "",
    shippingMethod: "",
    lineItems: [],
  };
}

function appendLineItem(order: ShopifyParsedOrder, row: Record<string, string>): void {
  const qty = parseQuantity(cell(row, "Lineitem quantity"));
  const name = cell(row, "Lineitem name");
  if (qty <= 0 && !name) return;

  const quantity = qty > 0 ? qty : 1;
  const unitPriceGrossCents = parseShopifyMoneyToCents(cell(row, "Lineitem price"));
  order.lineItems.push({
    quantity,
    name: name || "Artikel",
    unitPriceGrossCents,
    sku: cell(row, "Lineitem sku", "Lineitem SKU"),
  });
}

/**
 * Shopify-Export: erste Zeile pro Bestellung hat `Id`; Folgezeilen oft leeres `Id`,
 * manchmal wiederholtes `Name`. Gruppierung über `Id`, sonst gleicher `Name` = Fortsetzung.
 */
function isNewOrderRow(row: Record<string, string>, current: ShopifyParsedOrder | null): boolean {
  const id = cell(row, "Id");
  const name = cell(row, "Name");

  if (id) return true;
  if (!name) return false;
  if (current && name === current.shopifyName) return false;
  return true;
}

/**
 * Parst Shopify-Orders-CSV (eine Zeile pro Position; Order-Header oft nur in der ersten Zeile).
 */
export function parseShopifyOrderCsv(csvText: string): ShopifyParsedOrder[] {
  const rows = parseCsvAuto(csvText);
  const csvRows = csvRowsToObjects(rows);
  const orders: ShopifyParsedOrder[] = [];
  let current: ShopifyParsedOrder | null = null;

  for (const row of csvRows) {
    if (isNewOrderRow(row, current)) {
      current = newOrderFromRow(row);
      mergeOrderHeader(current, row);
      appendLineItem(current, row);
      orders.push(current);
      continue;
    }

    if (!current) continue;
    mergeOrderHeader(current, row);
    appendLineItem(current, row);
  }

  return orders;
}
