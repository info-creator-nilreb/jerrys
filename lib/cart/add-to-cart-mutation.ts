import { ensureCartIdAndCookie } from "@/lib/cart/cart-cookie";
import { resolveAddToCartNextQuantity } from "@/lib/cart/add-to-cart-quantity";
import type { ProductQuantityRules } from "@/lib/cart/quantity";
import { getPrisma } from "@/lib/db/prisma";

const variantSelect = {
  id: true,
  productId: true,
  availableQuantity: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
} as const;

export class AddToCartMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddToCartMutationError";
  }
}

export type AddToCartMutationInput = {
  productId: string;
  productVariantId?: string;
  explicitQuantity: number | null;
};

export type AddToCartMutationResult = {
  addedQuantity: number;
  badgeCount: number;
};

async function loadVariantForAdd(productId: string, productVariantId?: string) {
  const prisma = getPrisma();
  if (productVariantId) {
    return prisma.productVariant.findFirst({
      where: {
        id: productVariantId,
        productId,
        isActive: true,
        product: { isActive: true },
      },
      select: variantSelect,
    });
  }

  return prisma.productVariant.findFirst({
    where: {
      productId,
      isDefault: true,
      isActive: true,
      product: { isActive: true },
    },
    select: variantSelect,
  });
}

function rulesFromVariant(variant: {
  availableQuantity: number;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
}): ProductQuantityRules {
  return {
    availableQuantity: variant.availableQuantity,
    minOrderQty: variant.minOrderQty,
    purchaseStep: variant.purchaseStep,
    maxOrderQty: variant.maxOrderQty,
  };
}

/** Schnelle Warenkorb-Mutation: parallele Vorab-Queries, eine DB-Transaktion, kein Layout-Revalidate. */
export async function executeAddToCartMutation(
  input: AddToCartMutationInput,
): Promise<AddToCartMutationResult> {
  const [cartId, variant] = await Promise.all([
    ensureCartIdAndCookie(),
    loadVariantForAdd(input.productId, input.productVariantId),
  ]);

  if (!variant) {
    throw new AddToCartMutationError("Produkt nicht verfügbar.");
  }

  const rules = rulesFromVariant(variant);
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.cartLine.findUnique({
      where: {
        cartId_productVariantId: { cartId, productVariantId: variant.id },
      },
      select: { id: true, quantity: true },
    });

    const resolved = resolveAddToCartNextQuantity(
      rules,
      existing?.quantity ?? null,
      input.explicitQuantity,
    );
    if (!resolved.ok) {
      throw new AddToCartMutationError(resolved.error);
    }

    const { nextQty, addedQuantity } = resolved;

    if (existing) {
      await tx.cartLine.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      await tx.cartLine.create({
        data: {
          cartId,
          productId: variant.productId,
          productVariantId: variant.id,
          quantity: nextQty,
        },
      });
    }

    const agg = await tx.cartLine.aggregate({
      where: { cartId },
      _sum: { quantity: true },
    });

    return {
      addedQuantity,
      badgeCount: agg._sum.quantity ?? 0,
    };
  });
}
