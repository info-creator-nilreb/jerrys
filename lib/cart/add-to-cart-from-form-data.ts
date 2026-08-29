import { z } from "zod";
import {
  AddToCartMutationError,
  executeAddToCartMutation,
} from "@/lib/cart/add-to-cart-mutation";
import type { CartActionState } from "@/lib/cart/actions";
import { nonEmptyString } from "@/lib/validation/form";

const addSchema = z.object({
  productId: nonEmptyString,
  productVariantId: z.string().optional(),
});

/** Gemeinsame Validierung + Mutation für Server Action und Storefront-API. */
export async function addToCartFromFormData(formData: FormData): Promise<CartActionState> {
  const parsed = addSchema.safeParse({
    productId: formData.get("productId"),
    productVariantId: formData.get("productVariantId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Ungültiges Produkt." };
  }

  const rawQtyField = formData.get("quantity");
  const rawQtyTrimmed = rawQtyField !== null ? String(rawQtyField).trim() : "";
  const explicitQuantity = rawQtyTrimmed !== "" ? Number(rawQtyTrimmed) : null;

  try {
    const { addedQuantity, badgeCount } = await executeAddToCartMutation({
      productId: parsed.data.productId,
      productVariantId: parsed.data.productVariantId,
      explicitQuantity,
    });
    return { ok: true, addedQuantity, badgeCount };
  } catch (error) {
    if (error instanceof AddToCartMutationError) {
      return { error: error.message };
    }
    throw error;
  }
}
