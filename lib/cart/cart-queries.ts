import { getPrisma } from "@/lib/db/prisma";

export const cartVariantSelect = {
  id: true,
  sku: true,
  priceGrossCents: true,
  taxRatePercent: true,
  availableQuantity: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
};

const lineProductSelect = {
  id: true,
  slug: true,
  title: true,
  currency: true,
  isActive: true,
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
          productVariant: { select: cartVariantSelect },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type CartLineWithVariant = NonNullable<
  Awaited<ReturnType<typeof getCartWithLines>>
>["lines"][number];

export type CartLineCommerceSource = {
  productVariant: {
    availableQuantity: number;
    minOrderQty: number;
    purchaseStep: number;
    maxOrderQty: number | null;
    priceGrossCents: number;
    taxRatePercent: number;
  };
};

/** Preis- und Bestandsregeln aus der Warenkorb-Variante (Epic 2). */
export function cartLineCommerceRules(line: CartLineCommerceSource) {
  const v = line.productVariant;
  return {
    availableQuantity: v.availableQuantity,
    minOrderQty: v.minOrderQty,
    purchaseStep: v.purchaseStep,
    maxOrderQty: v.maxOrderQty,
    priceGrossCents: v.priceGrossCents,
    taxRatePercent: v.taxRatePercent,
  };
}
