import { getPrisma } from "@/lib/db/prisma";

const lineProductSelect = {
  id: true,
  slug: true,
  title: true,
  priceGrossCents: true,
  currency: true,
  taxRatePercent: true,
  isActive: true,
  stockQuantity: true,
  availableQuantity: true,
  shippingCountryCodes: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
  manufacturer: { select: { name: true } },
  images: {
    orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
    select: { url: true, alt: true },
  },
};

export async function getCartLineCountSum(cartId: string): Promise<number> {
  const agg = await getPrisma().cartLine.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function getCartWithLines(cartId: string) {
  return getPrisma().cart.findUnique({
    where: { id: cartId },
    include: {
      lines: {
        include: {
          product: { select: lineProductSelect },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
