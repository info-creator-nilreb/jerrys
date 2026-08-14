import type { FulfillmentStatus } from "@/app/generated/prisma/client";
import type { ShopifyParsedOrder, ShopifyParsedOrderLine } from "@/features/orders/domain/shopify-order-csv";

export const SHOPIFY_LEGACY_PRODUCT_SLUG = "shopify-import-legacy-item";
export const SHOPIFY_LEGACY_PRODUCT_TITLE = "Historischer Artikel (Shopify-Import)";

export type CatalogImportOrderLine = {
  sku: string;
  title: string;
  quantity: number;
  unitPriceGrossCents: number;
  lineTotalGrossCents: number;
  taxRatePercent: number;
  /** Nach SKU-Lookup gesetzt (Apply). */
  productId?: string;
  productVariantId?: string | null;
  skuMatched: boolean;
};

export type CatalogImportOrder = {
  shopifyName: string;
  shopifyId: string;
  orderNumber: string;
  idempotencyKey: string;
  email: string;
  phone: string | null;
  paymentMethod: string;
  deliveryMethod: "shipping" | "pickup";
  status: string;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: Date;
  currency: string;
  subtotalGrossCents: number;
  shippingCents: number;
  taxAmountCents: number;
  totalGrossCents: number;
  discountOffSubtotalCents: number;
  vatApplies: boolean;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany: string | null;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
  billingFirstName: string;
  billingLastName: string;
  billingCompany: string | null;
  billingLine1: string;
  billingLine2: string | null;
  billingZip: string;
  billingCity: string;
  billingCountry: string;
  customerNote: string | null;
  lineItems: CatalogImportOrderLine[];
  errors: string[];
  warnings: string[];
};

export type MapShopifyOrderOptions = {
  /** Default 19 — für Positionen ohne SKU-Steuersatz. */
  defaultTaxRatePercent?: 7 | 19;
};

export function shopifyOrderNumberFromName(name: string, shopifyId: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const digits = trimmed.replace(/^#/, "").trim();
    if (digits) return `SHOPIFY-${digits}`;
  }
  if (shopifyId.trim()) return `SHOPIFY-ID-${shopifyId.trim()}`;
  return "";
}

export function shopifyIdempotencyKey(shopifyId: string, orderNumber: string): string {
  if (shopifyId.trim()) return `shopify-order:${shopifyId.trim()}`;
  return `shopify-order-number:${orderNumber}`;
}

export function splitPersonName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: "Kunde", lastName: "Import" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "—" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function mapPaymentMethod(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) return "shopify_legacy";
  if (lower.includes("paypal")) return "paypal";
  if (lower.includes("klarna")) return "klarna";
  if (lower.includes("vorkasse") || lower.includes("manual") || lower.includes("bank")) {
    return "vorkasse";
  }
  return "shopify_legacy";
}

function mapFulfillmentStatus(raw: string): FulfillmentStatus {
  const lower = raw.trim().toLowerCase();
  if (lower === "fulfilled") return "delivered";
  if (lower === "partial") return "shipped";
  if (lower === "restocked") return "returned";
  if (lower === "preparing") return "preparing";
  return "unfulfilled";
}

export function mapShopifyOrderStatuses(
  financialStatus: string,
  fulfillmentStatus: string,
  cancelledAt: string,
): { status: string; fulfillmentStatus: FulfillmentStatus } {
  const fin = financialStatus.trim().toLowerCase();
  const cancelled = cancelledAt.trim().length > 0;

  if (cancelled || fin === "voided") {
    return { status: "cancelled", fulfillmentStatus: "unfulfilled" };
  }
  if (fin === "refunded" || fin === "partially_refunded") {
    return {
      status: "refunded",
      fulfillmentStatus: mapFulfillmentStatus(fulfillmentStatus),
    };
  }
  if (fin === "pending" || fin === "authorized") {
    return {
      status: "pending_payment",
      fulfillmentStatus: mapFulfillmentStatus(fulfillmentStatus),
    };
  }

  const fulfillment = mapFulfillmentStatus(fulfillmentStatus);
  if (fulfillment === "delivered") {
    return { status: "completed", fulfillmentStatus: fulfillment };
  }
  if (fulfillment === "shipped") {
    return { status: "shipped", fulfillmentStatus: fulfillment };
  }
  return { status: "paid", fulfillmentStatus: fulfillment };
}

function mapLineItem(
  line: ShopifyParsedOrderLine,
  taxRatePercent: number,
): CatalogImportOrderLine {
  const quantity = line.quantity;
  const unitPriceGrossCents = line.unitPriceGrossCents;
  const lineTotalGrossCents = unitPriceGrossCents * quantity;
  return {
    sku: line.sku.trim(),
    title: line.name.trim() || "Artikel",
    quantity,
    unitPriceGrossCents,
    lineTotalGrossCents,
    taxRatePercent,
    skuMatched: false,
  };
}

function countryCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return "DE";
  if (trimmed.length === 2) return trimmed;
  if (trimmed === "GERMANY" || trimmed === "DEUTSCHLAND") return "DE";
  return trimmed.slice(0, 2);
}

function isPickupShipping(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return lower.includes("pickup") || lower.includes("abhol") || lower.includes("local");
}

export function mapShopifyOrderToCatalog(
  source: ShopifyParsedOrder,
  options: MapShopifyOrderOptions = {},
): CatalogImportOrder {
  const taxRate = options.defaultTaxRatePercent ?? 19;
  const errors: string[] = [];
  const warnings: string[] = [];

  const orderNumber = shopifyOrderNumberFromName(source.shopifyName, source.shopifyId);
  if (!orderNumber) {
    errors.push("Keine Shopify-Bestellnummer (Name/Id) — Bestellung überspringen.");
  }

  const email = source.email.trim();
  if (!email) {
    errors.push("E-Mail fehlt — Gastbestell-Zuordnung später nicht möglich.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`Ungültige E-Mail: „${email}“.`);
  }

  const shippingPerson = splitPersonName(source.shippingName || source.billingName);
  const billingPerson = splitPersonName(source.billingName || source.shippingName);

  const shippingLine1 = source.shippingLine1.trim() || source.billingLine1.trim();
  const billingLine1 = source.billingLine1.trim() || source.shippingLine1.trim();
  const shippingZip = source.shippingZip.trim() || source.billingZip.trim() || "00000";
  const billingZip = source.billingZip.trim() || source.shippingZip.trim() || "00000";
  const shippingCity = source.shippingCity.trim() || source.billingCity.trim() || "—";
  const billingCity = source.billingCity.trim() || source.shippingCity.trim() || "—";

  if (!shippingLine1) {
    warnings.push("Versandadresse fehlt — Platzhalter gesetzt.");
  }
  if (!billingLine1) {
    warnings.push("Rechnungsadresse fehlt — Versandadresse übernommen.");
  }

  const lineItems = source.lineItems.map((line) => mapLineItem(line, taxRate));
  if (lineItems.length === 0) {
    errors.push("Keine Positionen in der Bestellung.");
  }

  for (const line of lineItems) {
    if (!line.sku) {
      warnings.push(`Position „${line.title}“ ohne SKU — wird dem Legacy-Produkt zugeordnet.`);
    }
  }

  const { status, fulfillmentStatus } = mapShopifyOrderStatuses(
    source.financialStatus,
    source.fulfillmentStatus,
    source.cancelledAt,
  );

  if (source.financialStatus.trim().toLowerCase() === "partially_refunded") {
    warnings.push("Teilerstattung in Shopify — Status „Erstattet“ gesetzt; Beträge unverändert.");
  }

  if (source.totalGrossCents <= 0 && lineItems.length > 0) {
    const computedSubtotal = lineItems.reduce((sum, l) => sum + l.lineTotalGrossCents, 0);
    warnings.push(
      `Gesamtbetrag fehlt/0 — aus Positionen berechnet (${(computedSubtotal / 100).toFixed(2)} € netto Positionssumme).`,
    );
  }

  let subtotalGrossCents = source.subtotalGrossCents;
  let totalGrossCents = source.totalGrossCents;
  if (subtotalGrossCents <= 0 && lineItems.length > 0) {
    subtotalGrossCents = lineItems.reduce((sum, l) => sum + l.lineTotalGrossCents, 0);
  }
  if (totalGrossCents <= 0) {
    totalGrossCents = subtotalGrossCents + source.shippingCents;
  }

  const createdAt = source.createdAt ?? new Date();

  return {
    shopifyName: source.shopifyName,
    shopifyId: source.shopifyId,
    orderNumber,
    idempotencyKey: shopifyIdempotencyKey(source.shopifyId, orderNumber),
    email,
    phone: source.phone.trim() || null,
    paymentMethod: mapPaymentMethod(source.paymentMethodRaw),
    deliveryMethod: isPickupShipping(source.shippingMethod) ? "pickup" : "shipping",
    status,
    fulfillmentStatus,
    createdAt,
    currency: source.currency.trim() || "EUR",
    subtotalGrossCents,
    shippingCents: source.shippingCents,
    taxAmountCents: source.taxAmountCents,
    totalGrossCents,
    discountOffSubtotalCents: source.discountOffSubtotalCents,
    vatApplies: true,
    shippingFirstName: shippingPerson.firstName,
    shippingLastName: shippingPerson.lastName,
    shippingCompany: source.shippingCompany.trim() || null,
    shippingLine1: shippingLine1 || "—",
    shippingLine2: source.shippingLine2.trim() || null,
    shippingZip,
    shippingCity,
    shippingCountry: countryCode(source.shippingCountry || source.billingCountry),
    billingFirstName: billingPerson.firstName,
    billingLastName: billingPerson.lastName,
    billingCompany: source.billingCompany.trim() || null,
    billingLine1: billingLine1 || shippingLine1 || "—",
    billingLine2: source.billingLine2.trim() || source.shippingLine2.trim() || null,
    billingZip,
    billingCity,
    billingCountry: countryCode(source.billingCountry || source.shippingCountry),
    customerNote: source.customerNote.trim() || null,
    lineItems,
    errors,
    warnings,
  };
}

export function mapShopifyOrdersToCatalog(
  sources: ShopifyParsedOrder[],
  options: MapShopifyOrderOptions = {},
): CatalogImportOrder[] {
  return sources.map((source) => mapShopifyOrderToCatalog(source, options));
}
