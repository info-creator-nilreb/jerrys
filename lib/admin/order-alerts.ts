import { getPrisma } from "@/lib/db/prisma";

export type AdminNewOrderAlert = {
  id: string;
  orderNumber: string;
  email: string;
  totalGrossCents: number;
  currency: string;
  createdAt: string;
};

export async function listOrdersCreatedAfter(since: Date): Promise<AdminNewOrderAlert[]> {
  const rows = await getPrisma().order.findMany({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      orderNumber: true,
      email: true,
      totalGrossCents: true,
      currency: true,
      createdAt: true,
    },
  });
  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    email: o.email,
    totalGrossCents: o.totalGrossCents,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
  }));
}
