import { getPrisma } from "@/lib/db/prisma";

const PAGE_SIZE = 80;

export async function listStockMovementsForAdmin(options?: { cursor?: string }) {
  const movements = await getPrisma().stockMovement.findMany({
    take: PAGE_SIZE + 1,
    ...(options?.cursor
      ? {
          cursor: { id: options.cursor },
          skip: 1,
        }
      : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quantityDelta: true,
      reason: true,
      createdAt: true,
      orderId: true,
      product: { select: { id: true, title: true, slug: true } },
      productVariant: { select: { id: true, sku: true } },
    },
  });

  const hasMore = movements.length > PAGE_SIZE;
  const rows = hasMore ? movements.slice(0, PAGE_SIZE) : movements;
  const nextCursor = hasMore ? rows[rows.length - 1]?.id : null;

  return { rows, nextCursor, hasMore };
}
