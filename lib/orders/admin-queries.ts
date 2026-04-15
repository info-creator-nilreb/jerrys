import { getPrisma } from "@/lib/db/prisma";

/** Kennzahlen und letzte Bestellungen für die Admin-Startseite. */
export async function getAdminDashboardOrdersSnapshot() {
  const prisma = getPrisma();
  const [totalCount, pendingPaymentCount, aggregate, recent] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending_payment" } }),
    prisma.order.aggregate({
      where: { currency: "EUR" },
      _sum: { totalGrossCents: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        status: true,
        totalGrossCents: true,
        currency: true,
        createdAt: true,
        _count: { select: { items: true } },
        payments: { select: { status: true } },
      },
    }),
  ]);

  return {
    totalCount,
    pendingPaymentCount,
    revenueEurCents: aggregate._sum.totalGrossCents ?? 0,
    recent,
  };
}

export async function listOrdersForAdmin() {
  return getPrisma().order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      status: true,
      totalGrossCents: true,
      currency: true,
      createdAt: true,
      _count: { select: { items: true } },
      payments: { select: { status: true } },
    },
  });
}

export async function getOrderDetailForAdmin(id: string) {
  return getPrisma().order.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          product: { select: { id: true, slug: true, title: true } },
        },
      },
      emailLogs: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}
