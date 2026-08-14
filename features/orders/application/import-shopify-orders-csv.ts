import { getPrisma } from "@/lib/db/prisma";
import { parseShopifyOrderCsv } from "@/features/orders/domain/shopify-order-csv";
import {
  SHOPIFY_LEGACY_PRODUCT_SLUG,
  SHOPIFY_LEGACY_PRODUCT_TITLE,
  mapShopifyOrdersToCatalog,
  type CatalogImportOrder,
  type MapShopifyOrderOptions,
} from "@/features/orders/domain/shopify-order-map";
import { buildCatalogMatchIndex } from "@/features/orders/application/build-catalog-match-index";
import {
  matchOrderLineToCatalog,
  type CatalogMatchIndex,
  type OrderLineMatchMethod,
} from "@/features/orders/domain/order-line-catalog-match";

const ORDER_EVENT_PLACED = "order.placed" as const;

/** Gleiche Normalisierung wie `normalizeCustomerEmail` (Gastbestell-Zuordnung). */
function normalizeImportEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ShopifyOrderImportMode = "dry-run" | "apply";

export type ShopifyOrderImportOptions = MapShopifyOrderOptions & {
  mode: ShopifyOrderImportMode;
  /** Bestehende Import-Bestellungen aktualisieren (nur apply, gleiche idempotencyKey). */
  updateExisting?: boolean;
  /** Bei Dry-Run idempotencyKey/orderNumber in DB prüfen. Default true. */
  checkExistingInDb?: boolean;
};

export type ShopifyOrderImportOrderResult = {
  shopifyName: string;
  orderNumber: string;
  email: string;
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
  /** Nach create/update für Admin-Links. */
  orderId?: string;
  message?: string;
};

export type ShopifyOrderImportReport = {
  mode: ShopifyOrderImportMode;
  orderCount: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  dbChecked: boolean;
  orders: ShopifyOrderImportOrderResult[];
  mapped: CatalogImportOrder[];
};

/** Reines Mapping + Validierung ohne Datenbank. */
export function planShopifyOrderCsvImport(
  csvText: string,
  mapOptions: MapShopifyOrderOptions = {},
): CatalogImportOrder[] {
  const parsed = parseShopifyOrderCsv(csvText);
  return mapShopifyOrdersToCatalog(parsed, mapOptions);
}

type SkuLookup = {
  productId: string;
  productVariantId: string | null;
  taxRatePercent: number;
};

function applyMatchToLine(
  line: CatalogImportOrder["lineItems"][number],
  entry: SkuLookup,
  method: OrderLineMatchMethod,
): void {
  line.productId = entry.productId;
  line.productVariantId = entry.productVariantId;
  line.taxRatePercent = entry.taxRatePercent;
  line.skuMatched = true;
  line.matchMethod = method;
}

function legacyLine(
  order: CatalogImportOrder,
  line: CatalogImportOrder["lineItems"][number],
  legacyProductId: string,
  message: string,
): void {
  if (legacyProductId) {
    line.productId = legacyProductId;
  }
  line.productVariantId = null;
  line.skuMatched = false;
  line.matchMethod = undefined;
  order.warnings.push(message);
}

function resolveLineProducts(
  order: CatalogImportOrder,
  index: CatalogMatchIndex,
  legacyProductId: string,
): void {
  for (const line of order.lineItems) {
    const result = matchOrderLineToCatalog({
      sku: line.sku,
      lineTitle: line.title,
      index,
    });

    if (result.matched) {
      applyMatchToLine(line, result.entry, result.method);
      if (result.method === "title_variant") {
        order.warnings.push(
          `Position „${line.title}“ per Titel+Variante zugeordnet (${result.entry.slug}).`,
        );
      } else if (result.method === "title_default") {
        order.warnings.push(
          `Position „${line.title}“ per Produkttitel (Default-Variante) zugeordnet (${result.entry.slug}).`,
        );
      }
      continue;
    }

    if (result.reason === "ambiguous_title") {
      legacyLine(
        order,
        line,
        legacyProductId,
        `Position „${line.title}“ — mehrdeutiger Produkttitel, kein eindeutiges Matching.`,
      );
      continue;
    }

    if (line.sku) {
      legacyLine(
        order,
        line,
        legacyProductId,
        `SKU „${line.sku}“ nicht im Katalog — Legacy-Produkt.`,
      );
    } else {
      legacyLine(
        order,
        line,
        legacyProductId,
        `Position „${line.title}“ — kein Katalog-Match (SKU/Titel/Variante).`,
      );
    }
  }
}

async function ensureLegacyImportProductId(): Promise<string> {
  const prisma = getPrisma();
  const existing = await prisma.product.findUnique({
    where: { slug: SHOPIFY_LEGACY_PRODUCT_SLUG },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.product.create({
    data: {
      slug: SHOPIFY_LEGACY_PRODUCT_SLUG,
      title: SHOPIFY_LEGACY_PRODUCT_TITLE,
      description: "Platzhalter für historische Shopify-Positionen ohne SKU-Match.",
      isActive: false,
      variants: {
        create: {
          sku: "SHOPIFY-LEGACY",
          priceGrossCents: 0,
          priceNetCents: 0,
          taxRatePercent: 19,
          stockQuantity: 0,
          availableQuantity: 0,
          isDefault: true,
          isActive: false,
        },
      },
    },
    select: { id: true },
  });
  return created.id;
}

function resultFromMapped(
  mapped: CatalogImportOrder,
  status: ShopifyOrderImportOrderResult["status"],
  message?: string,
  orderId?: string,
): ShopifyOrderImportOrderResult {
  return {
    shopifyName: mapped.shopifyName,
    orderNumber: mapped.orderNumber,
    email: mapped.email,
    status,
    errors: mapped.errors,
    warnings: mapped.warnings,
    lineCount: mapped.lineItems.length,
    orderId,
    message,
  };
}

const EXISTING_ORDER_LOOKUP_CHUNK = 1000;

async function findExistingImportOrderKeys(keys: string[]): Promise<Set<string>> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const existing = new Set<string>();
  const prisma = getPrisma();

  for (let i = 0; i < unique.length; i += EXISTING_ORDER_LOOKUP_CHUNK) {
    const chunk = unique.slice(i, i + EXISTING_ORDER_LOOKUP_CHUNK);
    const rows = await prisma.order.findMany({
      where: { idempotencyKey: { in: chunk } },
      select: { idempotencyKey: true },
    });
    for (const row of rows) {
      if (row.idempotencyKey) existing.add(row.idempotencyKey);
    }
  }

  return existing;
}

async function applyOneOrder(
  mapped: CatalogImportOrder,
  legacyProductId: string,
  catalogIndex: CatalogMatchIndex,
  updateExisting: boolean,
): Promise<ShopifyOrderImportOrderResult> {
  if (mapped.errors.length > 0) {
    return resultFromMapped(mapped, "invalid");
  }

  resolveLineProducts(mapped, catalogIndex, legacyProductId);

  const prisma = getPrisma();
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: mapped.idempotencyKey },
    select: { id: true },
  });

  if (existing && !updateExisting) {
    return resultFromMapped(mapped, "skipped", "Bereits importiert (idempotencyKey).");
  }

  const orderFields = {
    orderNumber: mapped.orderNumber,
    email: normalizeImportEmail(mapped.email),
    phone: mapped.phone,
    customerId: null as string | null,
    paymentMethod: mapped.paymentMethod,
    deliveryMethod: mapped.deliveryMethod,
    status: mapped.status,
    fulfillmentStatus: mapped.fulfillmentStatus,
    shippingFirstName: mapped.shippingFirstName,
    shippingLastName: mapped.shippingLastName,
    shippingCompany: mapped.shippingCompany,
    shippingLine1: mapped.shippingLine1,
    shippingLine2: mapped.shippingLine2,
    shippingZip: mapped.shippingZip,
    shippingCity: mapped.shippingCity,
    shippingCountry: mapped.shippingCountry,
    billingFirstName: mapped.billingFirstName,
    billingLastName: mapped.billingLastName,
    billingCompany: mapped.billingCompany,
    billingLine1: mapped.billingLine1,
    billingLine2: mapped.billingLine2,
    billingZip: mapped.billingZip,
    billingCity: mapped.billingCity,
    billingCountry: mapped.billingCountry,
    customerNote: mapped.customerNote,
    subtotalGrossCents: mapped.subtotalGrossCents,
    shippingCents: mapped.shippingCents,
    taxAmountCents: mapped.taxAmountCents,
    totalGrossCents: mapped.totalGrossCents,
    discountOffSubtotalCents: mapped.discountOffSubtotalCents,
    vatApplies: mapped.vatApplies,
    currency: mapped.currency,
    idempotencyKey: mapped.idempotencyKey,
    createdAt: mapped.createdAt,
  };

  const itemCreates = mapped.lineItems.map((line) => ({
    productId: line.productId!,
    productVariantId: line.productVariantId,
    skuSnapshot: line.sku || null,
    productTitleSnapshot: line.title,
    unitPriceGrossCents: line.unitPriceGrossCents,
    taxRatePercentSnapshot: line.taxRatePercent,
    quantity: line.quantity,
    lineTotalGrossCents: line.lineTotalGrossCents,
    currency: mapped.currency,
  }));

  try {
    if (existing && updateExisting) {
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
        await tx.order.update({
          where: { id: existing.id },
          data: orderFields,
        });
        for (const item of itemCreates) {
          await tx.orderItem.create({ data: { ...item, orderId: existing.id } });
        }
        await tx.orderEvent.create({
          data: {
            orderId: existing.id,
            eventType: ORDER_EVENT_PLACED,
            metadata: {
              source: "shopify_import",
              shopifyId: mapped.shopifyId,
              shopifyName: mapped.shopifyName,
              updated: true,
            },
          },
        });
      });
      return resultFromMapped(mapped, "updated", undefined, existing.id);
    }

    const createdId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          ...orderFields,
          items: { create: itemCreates },
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          eventType: ORDER_EVENT_PLACED,
          metadata: {
            source: "shopify_import",
            shopifyId: mapped.shopifyId,
            shopifyName: mapped.shopifyName,
          },
        },
      });
      return order.id;
    });
    return resultFromMapped(mapped, "created", undefined, createdId);
  } catch (e) {
    mapped.errors.push(e instanceof Error ? e.message : String(e));
    return resultFromMapped(mapped, "error", "Speichern fehlgeschlagen.");
  }
}

export async function importShopifyOrdersFromCsv(
  csvText: string,
  options: ShopifyOrderImportOptions,
): Promise<ShopifyOrderImportReport> {
  const mapped = planShopifyOrderCsvImport(csvText, options);
  const checkDb = options.checkExistingInDb !== false;
  const dbChecked = checkDb && options.mode === "dry-run";

  const catalogIndex = await buildCatalogMatchIndex();

  const orders: ShopifyOrderImportOrderResult[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  let legacyProductId: string | null = null;
  if (options.mode === "apply") {
    legacyProductId = await ensureLegacyImportProductId();
  }

  const existingKeys =
    options.mode === "dry-run" && checkDb
      ? await findExistingImportOrderKeys(mapped.map((order) => order.idempotencyKey))
      : null;

  for (const order of mapped) {
    if (order.errors.length > 0) {
      invalidCount += 1;
      orders.push(resultFromMapped(order, "invalid"));
      continue;
    }

    validCount += 1;

    if (options.mode === "dry-run") {
      let status: ShopifyOrderImportOrderResult["status"] = "would_create";
      let message: string | undefined;

      if (checkDb && existingKeys) {
        if (existingKeys.has(order.idempotencyKey)) {
          status = options.updateExisting ? "would_update" : "would_skip";
          message = options.updateExisting
            ? "Würde bestehende Import-Bestellung aktualisieren."
            : "Bereits importiert (idempotencyKey).";
        }
      }

      resolveLineProducts(order, catalogIndex, "");

      if (status === "would_skip") skippedCount += 1;
      else if (status === "would_update") updatedCount += 1;
      else createdCount += 1;

      orders.push(resultFromMapped(order, status, message));
      continue;
    }

    const result = await applyOneOrder(
      order,
      legacyProductId!,
      catalogIndex,
      options.updateExisting === true,
    );
    orders.push(result);

    if (result.status === "created") createdCount += 1;
    else if (result.status === "updated") updatedCount += 1;
    else if (result.status === "skipped") skippedCount += 1;
    else if (result.status === "error") invalidCount += 1;
  }

  return {
    mode: options.mode,
    orderCount: mapped.length,
    validCount,
    invalidCount,
    createdCount,
    updatedCount,
    skippedCount,
    dbChecked,
    orders,
    mapped,
  };
}
