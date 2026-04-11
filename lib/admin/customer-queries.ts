import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/db/prisma";

const CUSTOMER_KEY_HEX_LEN = 12;

export function normalizeAdminCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Stabiler URL-Schlüssel und Lookup-Wert (ohne DB-Migration). */
export function customerKeyFromNormalizedEmail(normalizedEmail: string): string {
  return createHash("sha256")
    .update(normalizedEmail, "utf8")
    .digest("hex")
    .slice(0, CUSTOMER_KEY_HEX_LEN)
    .toLowerCase();
}

export function adminCustomerNumberLabel(customerKey: string): string {
  return `K-${customerKey.toUpperCase()}`;
}

type OrderRowForCustomers = {
  id: string;
  email: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  totalGrossCents: number;
  currency: string;
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
};

const orderSelectForCustomers = {
  id: true,
  email: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  totalGrossCents: true,
  currency: true,
  shippingFirstName: true,
  shippingLastName: true,
  shippingCompany: true,
  shippingLine1: true,
  shippingLine2: true,
  shippingZip: true,
  shippingCity: true,
  shippingCountry: true,
  billingFirstName: true,
  billingLastName: true,
  billingCompany: true,
  billingLine1: true,
  billingLine2: true,
  billingZip: true,
  billingCity: true,
  billingCountry: true,
} as const;

export type AdminCustomerListRow = {
  customerKey: string;
  customerNumber: string;
  displayName: string;
  email: string;
  latestOrderStatus: string;
  orderCount: number;
  lastOrderAt: Date;
};

function shippingSnapshot(o: OrderRowForCustomers): string {
  return [
    o.shippingFirstName,
    o.shippingLastName,
    o.shippingCompany ?? "",
    o.shippingLine1,
    o.shippingLine2 ?? "",
    o.shippingZip,
    o.shippingCity,
    o.shippingCountry,
  ].join("|");
}

export async function listCustomersForAdmin(): Promise<AdminCustomerListRow[]> {
  const orders = (await getPrisma().order.findMany({
    orderBy: { createdAt: "desc" },
    select: orderSelectForCustomers,
  })) as OrderRowForCustomers[];

  type Agg = {
    orders: OrderRowForCustomers[];
    displayName: string;
    representativeEmail: string;
  };

  const byNorm = new Map<string, Agg>();

  for (const o of orders) {
    const norm = normalizeAdminCustomerEmail(o.email);
    let agg = byNorm.get(norm);
    if (!agg) {
      const name = [o.shippingFirstName, o.shippingLastName].filter(Boolean).join(" ").trim();
      agg = {
        orders: [],
        displayName: name || o.email,
        representativeEmail: o.email,
      };
      byNorm.set(norm, agg);
    }
    agg.orders.push(o);
  }

  const rows: AdminCustomerListRow[] = [];
  for (const [norm, agg] of byNorm) {
    const latest = agg.orders[0]!;
    const key = customerKeyFromNormalizedEmail(norm);
    rows.push({
      customerKey: key,
      customerNumber: adminCustomerNumberLabel(key),
      displayName: agg.displayName,
      email: agg.representativeEmail,
      latestOrderStatus: latest.status,
      orderCount: agg.orders.length,
      lastOrderAt: latest.createdAt,
    });
  }

  rows.sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
  return rows;
}

export type AdminCustomerAddressBlock = {
  nameLine: string;
  companyLine: string | null;
  streetLines: string[];
  cityLine: string;
  country: string;
};

export type AdminCustomerDetail = {
  customerKey: string;
  customerNumber: string;
  displayName: string;
  email: string;
  shipping: AdminCustomerAddressBlock;
  billing: AdminCustomerAddressBlock;
  billingDiffersFromShipping: boolean;
  addressVariesAcrossOrders: boolean;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    createdAt: Date;
    totalGrossCents: number;
    currency: string;
  }>;
};

function toShippingBlock(o: OrderRowForCustomers): AdminCustomerAddressBlock {
  const nameLine = [o.shippingFirstName, o.shippingLastName].filter(Boolean).join(" ").trim();
  const streetLines = [o.shippingLine1, o.shippingLine2].filter(Boolean) as string[];
  const cityLine = `${o.shippingZip} ${o.shippingCity}`.trim();
  return {
    nameLine,
    companyLine: o.shippingCompany?.trim() || null,
    streetLines,
    cityLine,
    country: o.shippingCountry,
  };
}

function toBillingBlock(o: OrderRowForCustomers): AdminCustomerAddressBlock {
  const nameLine = [o.billingFirstName, o.billingLastName].filter(Boolean).join(" ").trim();
  const streetLines = [o.billingLine1, o.billingLine2].filter(Boolean) as string[];
  const cityLine = `${o.billingZip} ${o.billingCity}`.trim();
  return {
    nameLine,
    companyLine: o.billingCompany?.trim() || null,
    streetLines,
    cityLine,
    country: o.billingCountry,
  };
}

function addressBlocksEqual(a: AdminCustomerAddressBlock, b: AdminCustomerAddressBlock): boolean {
  return (
    a.nameLine === b.nameLine &&
    a.companyLine === b.companyLine &&
    a.streetLines.join("\n") === b.streetLines.join("\n") &&
    a.cityLine === b.cityLine &&
    a.country === b.country
  );
}

export async function getCustomerDetailForAdmin(
  customerKey: string,
): Promise<AdminCustomerDetail | null> {
  const wanted = customerKey.trim().toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(wanted)) return null;

  const norms = new Set<string>();
  const emails = await getPrisma().order.findMany({
    select: { email: true },
    distinct: ["email"],
  });
  for (const { email } of emails) {
    norms.add(normalizeAdminCustomerEmail(email));
  }

  let matchedNorm: string | null = null;
  for (const norm of norms) {
    if (customerKeyFromNormalizedEmail(norm) === wanted) {
      matchedNorm = norm;
      break;
    }
  }
  if (!matchedNorm) return null;

  const orders = (await getPrisma().order.findMany({
    where: { email: { equals: matchedNorm, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: orderSelectForCustomers,
  })) as OrderRowForCustomers[];

  if (orders.length === 0) return null;

  const latest = orders[0]!;
  const shipping = toShippingBlock(latest);
  const billing = toBillingBlock(latest);
  const billingDiffersFromShipping = !addressBlocksEqual(shipping, billing);

  const firstShip = shippingSnapshot(latest);
  const addressVariesAcrossOrders = orders.some((o) => shippingSnapshot(o) !== firstShip);

  let displayName = [latest.shippingFirstName, latest.shippingLastName].filter(Boolean).join(" ").trim();
  if (!displayName) displayName = latest.email;

  return {
    customerKey: wanted,
    customerNumber: adminCustomerNumberLabel(wanted),
    displayName,
    email: latest.email,
    shipping,
    billing,
    billingDiffersFromShipping,
    addressVariesAcrossOrders,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      createdAt: o.createdAt,
      totalGrossCents: o.totalGrossCents,
      currency: o.currency,
    })),
  };
}
