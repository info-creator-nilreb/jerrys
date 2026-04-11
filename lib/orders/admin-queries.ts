import { getPrisma } from "@/lib/db/prisma";

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
