import type { Prisma } from "@/app/generated/prisma/client";
import {
  customerKeyFromNormalizedEmail,
  normalizeAdminCustomerEmail,
} from "@/lib/admin/customer-queries";
import { getPrisma } from "@/lib/db/prisma";

export type AdminSearchScope = "all" | "products" | "orders" | "customers";

export type AdminSearchProductHit = {
  type: "product";
  id: string;
  title: string;
  slug: string;
  productNumber: string | null;
};

export type AdminSearchOrderHit = {
  type: "order";
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  totalGrossCents: number;
  currency: string;
  createdAt: string;
};

export type AdminSearchCustomerHit = {
  type: "customer";
  customerKey: string;
  email: string;
  displayName: string;
  orderCount: number;
  latestOrderId: string;
  latestOrderAt: string;
};

export type AdminSearchResponse = {
  products: AdminSearchProductHit[];
  orders: AdminSearchOrderHit[];
  customers: AdminSearchCustomerHit[];
};

const MAX_EACH = 8;

function icontains(value: string): Prisma.StringFilter {
  return { contains: value, mode: "insensitive" };
}

export async function adminGlobalSearch(opts: {
  query: string;
  scope: AdminSearchScope;
}): Promise<AdminSearchResponse> {
  const term = opts.query.trim().slice(0, 100);
  if (term.length < 2) {
    return { products: [], orders: [], customers: [] };
  }

  const prisma = getPrisma();
  const scope = opts.scope;

  const runProducts =
    scope === "all" || scope === "products"
      ? prisma.product.findMany({
          where: {
            OR: [
              { title: icontains(term) },
              { slug: icontains(term) },
              { productNumber: icontains(term) },
              { subtitle: icontains(term) },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: MAX_EACH,
          select: {
            id: true,
            title: true,
            slug: true,
            productNumber: true,
          },
        })
      : Promise.resolve([]);

  const runOrders =
    scope === "all" || scope === "orders"
      ? prisma.order.findMany({
          where: {
            OR: [
              { orderNumber: icontains(term) },
              { email: icontains(term) },
              { shippingFirstName: icontains(term) },
              { shippingLastName: icontains(term) },
              { shippingCity: icontains(term) },
              { shippingZip: icontains(term) },
              { billingFirstName: icontains(term) },
              { billingLastName: icontains(term) },
              { phone: icontains(term) },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: MAX_EACH,
          select: {
            id: true,
            orderNumber: true,
            email: true,
            status: true,
            totalGrossCents: true,
            currency: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]);

  const runCustomerOrders =
    scope === "all" || scope === "customers"
      ? prisma.order.findMany({
          where: {
            OR: [
              { email: icontains(term) },
              { shippingFirstName: icontains(term) },
              { shippingLastName: icontains(term) },
              { billingFirstName: icontains(term) },
              { billingLastName: icontains(term) },
              { phone: icontains(term) },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            id: true,
            email: true,
            shippingFirstName: true,
            shippingLastName: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]);

  const [products, orders, customerOrders] = await Promise.all([
    runProducts,
    runOrders,
    runCustomerOrders,
  ]);

  const productHits: AdminSearchProductHit[] = products.map((p) => ({
    type: "product",
    id: p.id,
    title: p.title,
    slug: p.slug,
    productNumber: p.productNumber,
  }));

  const orderHits: AdminSearchOrderHit[] = orders.map((o) => ({
    type: "order",
    id: o.id,
    orderNumber: o.orderNumber,
    email: o.email,
    status: o.status,
    totalGrossCents: o.totalGrossCents,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
  }));

  const byEmail = new Map<
    string,
    {
      latestOrderId: string;
      latestOrderAt: Date;
      displayName: string;
      count: number;
    }
  >();

  for (const o of customerOrders) {
    const email = normalizeAdminCustomerEmail(o.email);
    const name = [o.shippingFirstName, o.shippingLastName].filter(Boolean).join(" ").trim();
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        latestOrderId: o.id,
        latestOrderAt: o.createdAt,
        displayName: name || o.email,
        count: 1,
      });
    } else {
      existing.count += 1;
      if (o.createdAt > existing.latestOrderAt) {
        existing.latestOrderAt = o.createdAt;
        existing.latestOrderId = o.id;
        if (name) existing.displayName = name;
      }
    }
  }

  const customerHits: AdminSearchCustomerHit[] = Array.from(byEmail.entries())
    .map(([email, v]) => ({
      type: "customer" as const,
      customerKey: customerKeyFromNormalizedEmail(email),
      email,
      displayName: v.displayName,
      orderCount: v.count,
      latestOrderId: v.latestOrderId,
      latestOrderAt: v.latestOrderAt.toISOString(),
    }))
    .sort((a, b) => (a.latestOrderAt < b.latestOrderAt ? 1 : -1))
    .slice(0, MAX_EACH);

  return { products: productHits, orders: orderHits, customers: customerHits };
}
