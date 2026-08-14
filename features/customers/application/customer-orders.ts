import { getPrisma } from "@/lib/db/prisma";

export type CustomerOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  deliveryMethod: string;
  createdAt: Date;
  totalGrossCents: number;
  currency: string;
  itemCount: number;
};

export type CustomerOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  createdAt: Date;
  email: string;
  paymentMethod: string;
  currency: string;
  subtotalGrossCents: number;
  shippingCents: number;
  discountOffSubtotalCents: number;
  taxAmountCents: number;
  totalGrossCents: number;
  deliveryMethod: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany: string | null;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
  items: Array<{
    id: string;
    productTitleSnapshot: string;
    skuSnapshot: string | null;
    quantity: number;
    unitPriceGrossCents: number;
    lineTotalGrossCents: number;
  }>;
};

/**
 * Lists orders owned by the customer account (customerId), never by email alone.
 */
export async function listOrdersForCustomer(
  customerId: string,
): Promise<CustomerOrderListItem[]> {
  const rows = await getPrisma().order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      fulfillmentStatus: true,
      deliveryMethod: true,
      createdAt: true,
      totalGrossCents: true,
      currency: true,
      _count: { select: { items: true } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    fulfillmentStatus: o.fulfillmentStatus,
    deliveryMethod: o.deliveryMethod,
    createdAt: o.createdAt,
    totalGrossCents: o.totalGrossCents,
    currency: o.currency,
    itemCount: o._count.items,
  }));
}

/**
 * Order detail for the owning customer. Returns null when missing or not owned
 * (callers should map null → 404 without revealing existence).
 */
export async function getOrderForCustomer(params: {
  customerId: string;
  orderNumber: string;
}): Promise<CustomerOrderDetail | null> {
  const orderNumber = params.orderNumber.trim();
  if (!orderNumber) return null;

  const order = await getPrisma().order.findFirst({
    where: {
      orderNumber,
      customerId: params.customerId,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      fulfillmentStatus: true,
      createdAt: true,
      email: true,
      paymentMethod: true,
      currency: true,
      subtotalGrossCents: true,
      shippingCents: true,
      discountOffSubtotalCents: true,
      taxAmountCents: true,
      totalGrossCents: true,
      deliveryMethod: true,
      shippingCarrier: true,
      trackingNumber: true,
      shippingFirstName: true,
      shippingLastName: true,
      shippingCompany: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingZip: true,
      shippingCity: true,
      shippingCountry: true,
      items: {
        select: {
          id: true,
          productTitleSnapshot: true,
          skuSnapshot: true,
          quantity: true,
          unitPriceGrossCents: true,
          lineTotalGrossCents: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  return order;
}
